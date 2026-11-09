import os
import time
import httpx
from typing import Any, Dict, List

SERVICES_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "api-gateway",
        "name": "API Gateway",
        "port": 8000,
        "planned_sprint": 1,
        "is_active_sprint": True,
        "url": None,  # Self
    },
    {
        "id": "auth-service",
        "name": "Auth Service",
        "port": 8001,
        "planned_sprint": 1,
        "is_active_sprint": True,
        "url_env": "AUTH_SERVICE_URL",
        "default_url": "http://localhost:8001",
    },
    {
        "id": "lps-config-service",
        "name": "LPS Configuration Service",
        "port": 8002,
        "planned_sprint": 2,
        "is_active_sprint": True,
        "url_env": "LPS_CONFIG_SERVICE_URL",
        "default_url": "http://localhost:8002",
    },
    {
        "id": "catalog-service",
        "name": "Catalog Service",
        "port": 8003,
        "planned_sprint": 2,
        "is_active_sprint": True,
        "url_env": "CATALOG_SERVICE_URL",
        "default_url": "http://localhost:8003",
    },
    {
        "id": "cart-service",
        "name": "Cart Service",
        "port": 8004,
        "planned_sprint": 3,
        "is_active_sprint": True,
        "url_env": "CART_SERVICE_URL",
        "default_url": "http://localhost:8004",
    },
    {
        "id": "orders-service",
        "name": "Orders Service",
        "port": 8005,
        "planned_sprint": 3,
        "is_active_sprint": True,
        "url_env": "ORDERS_SERVICE_URL",
        "default_url": "http://localhost:8005",
    },
    {
        "id": "payments-service",
        "name": "Payments Service",
        "port": 8006,
        "planned_sprint": 3,
        "is_active_sprint": True,
        "url_env": "PAYMENTS_SERVICE_URL",
        "default_url": "http://localhost:8006",
    },
    {
        "id": "shipping-service",
        "name": "Shipping Service",
        "port": 8007,
        "planned_sprint": 3,
        "is_active_sprint": True,
        "url_env": "SHIPPING_SERVICE_URL",
        "default_url": "http://localhost:8007",
    },
    {
        "id": "recommendation-service",
        "name": "Recommendation Service",
        "port": 8008,
        "planned_sprint": 4,
        "is_active_sprint": True,
        "url_env": "RECOMMENDATION_SERVICE_URL",
        "default_url": "http://localhost:8008",
    },
]


async def probe_all_services() -> List[Dict[str, Any]]:
    """
    Sonda a saúde de todos os 9 microsserviços catalogados (PB-27).
    Distingue:
    - UP: Serviço respondendo 200 OK no health check.
    - DOWN: Serviço esperado na sprint ativa, mas com falha ou erro.
    - NOT_STARTED: Serviço planejado para sprints futuras, não inicializado.
    """
    results: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=2.0) as client:
        for svc in SERVICES_CATALOG:
            # Self check for API Gateway
            if svc["id"] == "api-gateway":
                results.append({
                    "id": svc["id"],
                    "name": svc["name"],
                    "port": svc["port"],
                    "planned_sprint": svc["planned_sprint"],
                    "status": "UP",
                    "latency_ms": 0.5,
                    "message": "Gateway ativo e roteando",
                })
                continue

            # If not active in this sprint, report NOT_STARTED
            if not svc["is_active_sprint"]:
                results.append({
                    "id": svc["id"],
                    "name": svc["name"],
                    "port": svc["port"],
                    "planned_sprint": svc["planned_sprint"],
                    "status": "NOT_STARTED",
                    "latency_ms": None,
                    "message": f"Planejado para a Sprint {svc['planned_sprint']}",
                })
                continue

            # For active services (e.g. auth-service in Sprint 1), probe health
            url = os.environ.get(svc["url_env"], svc["default_url"])
            health_url = f"{url.rstrip('/')}/health"
            start = time.perf_counter()

            try:
                resp = await client.get(health_url)
                latency = round((time.perf_counter() - start) * 1000, 2)
                if resp.status_code == 200:
                    results.append({
                        "id": svc["id"],
                        "name": svc["name"],
                        "port": svc["port"],
                        "planned_sprint": svc["planned_sprint"],
                        "status": "UP",
                        "latency_ms": latency,
                        "message": "Serviço operacional e saudável",
                    })
                else:
                    results.append({
                        "id": svc["id"],
                        "name": svc["name"],
                        "port": svc["port"],
                        "planned_sprint": svc["planned_sprint"],
                        "status": "DOWN",
                        "latency_ms": latency,
                        "message": f"Resposta HTTP inválida: {resp.status_code}",
                    })
            except Exception as e:
                results.append({
                    "id": svc["id"],
                    "name": svc["name"],
                    "port": svc["port"],
                    "planned_sprint": svc["planned_sprint"],
                    "status": "DOWN",
                    "latency_ms": None,
                    "message": f"Falha de conexão: {type(e).__name__}",
                })

    return results
