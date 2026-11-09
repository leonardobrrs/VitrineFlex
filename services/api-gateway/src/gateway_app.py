import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from python_common.errors import AppError, error_json_response
from diagnostics import probe_all_services
from proxy import reverse_proxy

app = FastAPI(
    title="VitrineFlex API Gateway",
    description="Ponto único de borda, roteamento, sanitização de segurança e agregação de saúde",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return exc.to_response()


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return error_json_response(
        status_code=500,
        code="INTERNAL_GATEWAY_ERROR",
        message=f"Erro no processamento do API Gateway: {str(exc)}",
    )


@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "api-gateway",
        "port": int(os.environ.get("API_GATEWAY_PORT", 8000)),
    }


@app.get("/api/v1/system/services")
async def get_system_services():
    """Retorna o estado operacional e as portas de todos os 9 microsserviços (PB-27)."""
    services = await probe_all_services()
    return {
        "gateway_port": int(os.environ.get("API_GATEWAY_PORT", 8000)),
        "total_services": len(services),
        "services": services,
    }


# Proxy catch-all for all microservices public routes (/api/v1/*)
@app.api_route("/api/v1/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def gateway_proxy_route(request: Request, full_path: str):
    return await reverse_proxy(request)
