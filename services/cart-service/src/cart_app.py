from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from python_common.errors import register_exception_handlers
from cart_database import init_db
from cart_routes import router

init_db()

app = FastAPI(
    title="VitrineFlex Cart Service",
    version="1.0.0",
    description="Serviço de gestão de carrinho de compras isolado por loja e usuário (PB-15)",
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
