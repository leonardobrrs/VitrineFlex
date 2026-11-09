import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from python_common.errors import AppError, error_json_response
from auth_database import init_db
from auth_routes import router
from auth_admin_routes import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="VitrineFlex Auth Service",
    description="Serviço de autenticação, usuários e gestão de perfis",
    version="1.0.0",
    lifespan=lifespan,
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return error_json_response(
        status_code=422,
        code="VALIDATION_ERROR",
        message="Dados de requisição inválidos.",
        details=exc.errors(),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return error_json_response(
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
        message=f"Erro interno no servidor: {str(exc)}",
    )


@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "auth-service",
        "port": int(os.environ.get("AUTH_SERVICE_PORT", 8001)),
    }


app.include_router(router)
app.include_router(admin_router)
