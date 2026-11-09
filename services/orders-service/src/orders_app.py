from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from python_common.errors import register_exception_handlers
from orders_database import init_db
from orders_routes import router

init_db()

app = FastAPI(
    title="VitrineFlex Orders Service",
    version="1.0.0",
    description="Orquestrador da Saga de Checkout e Histórico de Pedidos Imutáveis (PB-18, PB-19)",
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
