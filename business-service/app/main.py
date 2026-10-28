from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine, Base
import app.db.models  # Importante para que SQLAlchemy registre todos los modelos
from app.api.routes import clientes, motores, ordenes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Asegura la existencia de tablas como respaldo defensivo
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Business Service - API de Taller de Minería Pesada",
    description="Microservicio para la gestión de clientes, motores y órdenes de reparación con trazabilidad de estados",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuración de CORS
origins = [
    settings.CORS_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint de Healthcheck público
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "business-service",
    }


# Inclusión de routers de negocio bajo el prefijo /api
app.include_router(clientes.router, prefix="/api")
app.include_router(motores.router, prefix="/api")
app.include_router(ordenes.router, prefix="/api")
