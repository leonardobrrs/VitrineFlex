import os
import time
from typing import Any, Dict, Optional
import httpx

from python_common.errors import AppError
from python_common.security import HEADER_INTERNAL_TOKEN, get_internal_service_key

DEFAULT_LPS_URL = "http://localhost:8002"
DEFAULT_CACHE_TTL = 30.0  # 30 seconds as mandated by ADR-004


class CachedManifest:
    def __init__(self, manifest: Dict[str, Any], ttl_seconds: float = DEFAULT_CACHE_TTL):
        self.manifest = manifest
        self.expires_at = time.time() + ttl_seconds
        self.manifest_version = manifest.get("version", 1)

    @property
    def is_expired(self) -> bool:
        return time.time() >= self.expires_at


class FeatureManifestProvider:
    """
    Enforcement de features no backend com cache local em memória (ADR-004):
    - Consulta o LPS Configuration Service para obter o ProductManifest da loja.
    - Mantém cache local indexado por store_id com TTL de 30 segundos.
    - Em caso de falha de rede sem cache válido, falha fechado (fail closed).
    - Valida features ativas (HTTP 403 FEATURE_NOT_ENABLED).
    - Valida segmento comercial esperado (HTTP 422 INVALID_FEATURE_CONFIGURATION).
    """

    def __init__(
        self,
        lps_base_url: Optional[str] = None,
        cache_ttl_seconds: float = DEFAULT_CACHE_TTL,
    ):
        self._lps_base_url = lps_base_url or os.environ.get("LPS_CONFIG_SERVICE_URL", DEFAULT_LPS_URL).rstrip("/")
        self._cache_ttl_seconds = float(os.environ.get("MANIFEST_CACHE_TTL", cache_ttl_seconds))
        self._cache: Dict[str, CachedManifest] = {}

    def clear_cache(self) -> None:
        self._cache.clear()

    def set_cache_entry(self, store_id: str, manifest: Dict[str, Any], ttl_seconds: Optional[float] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._cache_ttl_seconds
        self._cache[store_id] = CachedManifest(manifest, ttl)

    def get_manifest(self, store_id: str) -> Dict[str, Any]:
        """Obtém o manifesto da loja, utilizando cache se válido ou consultando o LPS Configuration Service."""
        cached = self._cache.get(store_id)
        if cached and not cached.is_expired:
            return cached.manifest

        # Fetch from LPS Configuration Service via internal endpoint
        internal_url = f"{self._lps_base_url}/internal/v1/lps/stores/{store_id}/manifest"
        headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(internal_url, headers=headers)
                if resp.status_code == 200:
                    manifest = resp.json()
                    self.set_cache_entry(store_id, manifest)
                    return manifest
                elif resp.status_code == 404:
                    raise AppError(
                        status_code=404,
                        code="STORE_NOT_FOUND",
                        message=f"Loja '{store_id}' não encontrada no LPS Configuration Service.",
                    )
                else:
                    raise AppError(
                        status_code=502,
                        code="LPS_SERVICE_UNAVAILABLE",
                        message=f"Erro ao obter manifesto da loja no LPS Configuration Service (status {resp.status_code}).",
                    )
        except httpx.RequestError as exc:
            # Fail closed: cannot verify features without LPS or valid cache
            raise AppError(
                status_code=503,
                code="LPS_SERVICE_UNAVAILABLE",
                message=f"Falha de conexão com o LPS Configuration Service: {str(exc)}",
            )

    async def get_manifest_async(self, store_id: str) -> Dict[str, Any]:
        """Versão assíncrona para rotas assíncronas."""
        cached = self._cache.get(store_id)
        if cached and not cached.is_expired:
            return cached.manifest

        internal_url = f"{self._lps_base_url}/internal/v1/lps/stores/{store_id}/manifest"
        headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(internal_url, headers=headers)
                if resp.status_code == 200:
                    manifest = resp.json()
                    self.set_cache_entry(store_id, manifest)
                    return manifest
                elif resp.status_code == 404:
                    raise AppError(
                        status_code=404,
                        code="STORE_NOT_FOUND",
                        message=f"Loja '{store_id}' não encontrada no LPS Configuration Service.",
                    )
                else:
                    raise AppError(
                        status_code=502,
                        code="LPS_SERVICE_UNAVAILABLE",
                        message=f"Erro ao obter manifesto da loja no LPS Configuration Service (status {resp.status_code}).",
                    )
        except httpx.RequestError as exc:
            raise AppError(
                status_code=503,
                code="LPS_SERVICE_UNAVAILABLE",
                message=f"Falha de conexão com o LPS Configuration Service: {str(exc)}",
            )

    def is_feature_enabled(self, store_id: str, feature_key: str) -> bool:
        """Verifica se uma feature específica está habilitada para a loja."""
        manifest = self.get_manifest(store_id)
        features = manifest.get("features", {})
        return bool(features.get(feature_key, False))

    async def is_feature_enabled_async(self, store_id: str, feature_key: str) -> bool:
        manifest = await self.get_manifest_async(store_id)
        features = manifest.get("features", {})
        return bool(features.get(feature_key, False))

    def assert_feature_enabled(self, store_id: str, feature_key: str) -> None:
        """Lança 403 FEATURE_NOT_ENABLED se a feature não estiver ativada."""
        if not self.is_feature_enabled(store_id, feature_key):
            raise AppError(
                status_code=403,
                code="FEATURE_NOT_ENABLED",
                message=f"A funcionalidade '{feature_key}' não está habilitada para a loja '{store_id}'.",
                details={"store_id": store_id, "feature": feature_key},
            )

    async def assert_feature_enabled_async(self, store_id: str, feature_key: str) -> None:
        enabled = await self.is_feature_enabled_async(store_id, feature_key)
        if not enabled:
            raise AppError(
                status_code=403,
                code="FEATURE_NOT_ENABLED",
                message=f"A funcionalidade '{feature_key}' não está habilitada para a loja '{store_id}'.",
                details={"store_id": store_id, "feature": feature_key},
            )

    def assert_segment(self, store_id: str, expected_segment: str) -> None:
        """Valida que o segmento da loja corresponde ao esperado (ex: TECH para comparador)."""
        manifest = self.get_manifest(store_id)
        actual_segment = manifest.get("segment", "").upper()
        if actual_segment != expected_segment.upper():
            raise AppError(
                status_code=403,
                code="FEATURE_NOT_ENABLED",
                message=f"Operação exclusiva do segmento '{expected_segment}'. Segmento atual da loja: '{actual_segment}'.",
                details={"store_id": store_id, "expected_segment": expected_segment, "actual_segment": actual_segment},
            )

    async def assert_segment_async(self, store_id: str, expected_segment: str) -> None:
        manifest = await self.get_manifest_async(store_id)
        actual_segment = manifest.get("segment", "").upper()
        if actual_segment != expected_segment.upper():
            raise AppError(
                status_code=403,
                code="FEATURE_NOT_ENABLED",
                message=f"Operação exclusiva do segmento '{expected_segment}'. Segmento atual da loja: '{actual_segment}'.",
                details={"store_id": store_id, "expected_segment": expected_segment, "actual_segment": actual_segment},
            )
