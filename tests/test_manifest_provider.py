import pytest
import time
from python_common.manifest_provider import FeatureManifestProvider
from python_common.errors import AppError


def test_manifest_provider_cache_and_expiration():
    provider = FeatureManifestProvider(cache_ttl_seconds=1.0)
    manifest = {
        "store_id": "store-123",
        "segment": "FASHION",
        "version": 1,
        "features": {
            "auth": True,
            "catalog": True,
            "favorites": True,
            "product_comparison": False,
        },
    }

    # Manually inject into cache
    provider.set_cache_entry("store-123", manifest, ttl_seconds=0.2)

    # Within TTL
    assert provider.is_feature_enabled("store-123", "favorites") is True
    assert provider.is_feature_enabled("store-123", "product_comparison") is False
    assert provider.is_feature_enabled("store-123", "non_existent") is False

    # Assertions
    provider.assert_feature_enabled("store-123", "favorites")
    provider.assert_segment("store-123", "FASHION")

    with pytest.raises(AppError) as exc_info:
        provider.assert_feature_enabled("store-123", "product_comparison")
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "FEATURE_NOT_ENABLED"

    with pytest.raises(AppError) as exc_seg:
        provider.assert_segment("store-123", "TECH")
    assert exc_seg.value.status_code == 403
    assert exc_seg.value.code == "FEATURE_NOT_ENABLED"

    # Sleep to expire cache
    time.sleep(0.3)
    # Once expired, without LPS service online, should fail closed (503)
    with pytest.raises(AppError) as exc_exp:
        provider.get_manifest("store-123")
    assert exc_exp.value.status_code == 503
