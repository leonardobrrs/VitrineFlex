from typing import Any, Optional
from pydantic import BaseModel, Field
from fastapi import HTTPException
from fastapi.responses import JSONResponse


class APIErrorDetail(BaseModel):
    code: str = Field(..., description="Canonical error code")
    message: str = Field(..., description="Human readable explanation")
    details: Optional[Any] = Field(None, description="Additional context or validation details")


class APIErrorResponse(BaseModel):
    error: APIErrorDetail


class AppError(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Any] = None,
        headers: Optional[dict[str, str]] = None,
    ):
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.message = message
        self.details = details

    def to_response(self) -> JSONResponse:
        return JSONResponse(
            status_code=self.status_code,
            content={
                "error": {
                    "code": self.code,
                    "message": self.message,
                    "details": self.details,
                }
            },
            headers=self.headers,
        )


def error_json_response(status_code: int, code: str, message: str, details: Optional[Any] = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        },
    )


def register_exception_handlers(app: Any) -> None:
    from fastapi.exceptions import RequestValidationError
    from fastapi import Request

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
            message=f"Erro interno não tratado: {str(exc)}",
        )
