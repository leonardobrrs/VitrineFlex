import os
import sys
from pathlib import Path
import pytest

# Ensure PYTHONPATH includes packages and services
root_dir = Path(__file__).resolve().parent.parent
python_common_path = root_dir / "packages" / "python-common"
auth_service_path = root_dir / "services" / "auth-service" / "src"
gateway_path = root_dir / "services" / "api-gateway" / "src"
lps_service_path = root_dir / "services" / "lps-config-service" / "src"
catalog_service_path = root_dir / "services" / "catalog-service" / "src"
cart_service_path = root_dir / "services" / "cart-service" / "src"
orders_service_path = root_dir / "services" / "orders-service" / "src"
payments_service_path = root_dir / "services" / "payments-service" / "src"
shipping_service_path = root_dir / "services" / "shipping-service" / "src"
recommendation_service_path = root_dir / "services" / "recommendation-service" / "src"

for p in [
    str(python_common_path),
    str(auth_service_path),
    str(gateway_path),
    str(lps_service_path),
    str(catalog_service_path),
    str(cart_service_path),
    str(orders_service_path),
    str(payments_service_path),
    str(shipping_service_path),
    str(recommendation_service_path),
]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Set test environment variables
os.environ["ENVIRONMENT"] = "testing"
os.environ["AUTH_DB_NAME"] = "test_auth.db"
os.environ["LPS_DB_NAME"] = "test_lps.db"
os.environ["CATALOG_DB_NAME"] = "test_catalog.db"
os.environ["CART_DB_NAME"] = "test_cart.db"
os.environ["ORDERS_DB_NAME"] = "test_orders.db"
os.environ["PAYMENTS_DB_NAME"] = "test_payments.db"
os.environ["SHIPPING_DB_NAME"] = "test_shipping.db"
os.environ["RECOMMENDATION_DB_NAME"] = "test_recommendations.db"
os.environ["DB_STORAGE_DIR"] = str(root_dir / "data_test")
os.environ["JWT_SECRET_KEY"] = "test-secret-key-vitrineflex-ufal-2026"
os.environ["INTERNAL_SERVICE_KEY"] = "test-internal-service-token-2026"
