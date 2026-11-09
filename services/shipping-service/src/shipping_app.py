from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from python_common.errors import register_exception_handlers
from shipping_database import init_db
from shipping_routes import router

init_db()

app = FastAPI(
    title="VitrineFlex Shipping Service",
    version="1.0.0",
    description="Cotação simulada de frete e validação de modalidades por CEP e manifesto da loja (PB-17)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(router)
