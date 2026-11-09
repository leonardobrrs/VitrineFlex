from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from python_common.errors import register_exception_handlers
from recommendation_database import init_db
from recommendation_routes import router

init_db()

app = FastAPI(
    title="VitrineFlex Recommendation Service",
    version="1.0.0",
    description="Registro comportamental de interações e algoritmo explicável de recomendação (PB-20, PB-21)",
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
