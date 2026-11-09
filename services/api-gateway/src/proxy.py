import os
import httpx
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from python_common.errors import error_json_response
from sanitizer import sanitize_and_inject_headers

SERVICE_ROUTES = {
    "/api/v1/auth": "AUTH_SERVICE_URL",
    "/api/v1/lps": "LPS_CONFIG_SERVICE_URL",
    "/api/v1/catalog": "CATALOG_SERVICE_URL",
    "/api/v1/cart": "CART_SERVICE_URL",
    "/api/v1/orders": "ORDERS_SERVICE_URL",
    "/api/v1/payments": "PAYMENTS_SERVICE_URL",
    "/api/v1/shipping": "SHIPPING_SERVICE_URL",
    "/api/v1/recommendations": "RECOMMENDATION_SERVICE_URL",
}

DEFAULT_SERVICE_URLS = {
    "AUTH_SERVICE_URL": "http://127.0.0.1:8001",
    "LPS_CONFIG_SERVICE_URL": "http://127.0.0.1:8002",
    "CATALOG_SERVICE_URL": "http://127.0.0.1:8003",
    "CART_SERVICE_URL": "http://127.0.0.1:8004",
    "ORDERS_SERVICE_URL": "http://127.0.0.1:8005",
    "PAYMENTS_SERVICE_URL": "http://127.0.0.1:8006",
    "SHIPPING_SERVICE_URL": "http://127.0.0.1:8007",
    "RECOMMENDATION_SERVICE_URL": "http://127.0.0.1:8008",
}


def resolve_target_service(path: str) -> tuple[str, str] | None:
    for prefix, env_var in SERVICE_ROUTES.items():
        if path.startswith(prefix):
            base_url = os.environ.get(env_var, DEFAULT_SERVICE_URLS[env_var]).rstrip("/")
            return base_url, path
    return None


async def reverse_proxy(request: Request) -> Response:
    path = request.url.path
    target = resolve_target_service(path)

    if not target:
        return error_json_response(
            status_code=404,
            code="ROUTE_NOT_FOUND",
            message=f"Rota não encontrada no API Gateway: {path}",
        )

    base_url, full_path = target
    target_url = f"{base_url}{full_path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    body = await request.body()
    sanitized_headers, _ = sanitize_and_inject_headers(request, body)

    # Exclude hop-by-hop headers
    forward_headers = {
        k: v for k, v in sanitized_headers.items()
        if k.lower() not in {"host", "content-length"}
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            downstream_resp = await client.request(
                method=request.method,
                url=target_url,
                headers=forward_headers,
                content=body,
            )

            # Build response
            excluded_resp_headers = {"content-encoding", "content-length", "transfer-encoding", "connection"}
            resp_headers = {
                k: v for k, v in downstream_resp.headers.items()
                if k.lower() not in excluded_resp_headers
            }

            return Response(
                content=downstream_resp.content,
                status_code=downstream_resp.status_code,
                headers=resp_headers,
                media_type=downstream_resp.headers.get("content-type"),
            )
    except httpx.ConnectError:
        return error_json_response(
            status_code=503,
            code="SERVICE_UNAVAILABLE",
            message=f"O serviço de destino para a rota '{path}' está temporariamente indisponível.",
        )
    except httpx.TimeoutException:
        return error_json_response(
            status_code=504,
            code="GATEWAY_TIMEOUT",
            message="Tempo limite esgotado ao aguardar resposta do serviço interno.",
        )
    except Exception as e:
        return error_json_response(
            status_code=502,
            code="BAD_GATEWAY",
            message=f"Erro de comunicação do Gateway com o serviço interno: {str(e)}",
        )
