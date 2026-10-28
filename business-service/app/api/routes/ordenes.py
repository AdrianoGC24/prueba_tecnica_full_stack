from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user
from app.schemas.orden import (
    OrdenCreate,
    OrdenUpdate,
    OrdenUpdateEstado,
    OrdenResponse,
    OrdenDetailResponse,
    ResumenEstadosResponse,
)
from app.services import orden_service

router = APIRouter(
    prefix="/ordenes",
    tags=["Órdenes de Reparación"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/resumen-estados", response_model=ResumenEstadosResponse)
def get_resumen_estados(
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Devuelve el conteo de órdenes agrupado por cada uno de los 7 estados oficiales más el total.
    Utilizado para los contadores del Dashboard de monitoreo.
    """
    return orden_service.get_resumen_estados(db=db)


@router.get("", response_model=List[OrdenResponse])
def get_ordenes(
    estado: Optional[str] = Query(None, description="Filtrar por estado de la orden"),
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente"),
    motor_id: Optional[int] = Query(None, description="Filtrar por motor"),
    search: Optional[str] = Query(None, description="Búsqueda por número de orden o técnico responsable"),
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lista órdenes de reparación con filtros combinables."""
    return orden_service.list_ordenes(
        db=db,
        estado=estado,
        cliente_id=cliente_id,
        motor_id=motor_id,
        search=search,
    )


@router.post("", response_model=OrdenResponse, status_code=status.HTTP_201_CREATED)
def create_orden(
    orden_in: OrdenCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Crea una nueva orden de reparación.
    Registra automáticamente la primera entrada en historial_estados_orden.
    """
    user_id = current_user.get("userId")
    user_email = current_user.get("email")

    return orden_service.create_orden(
        db=db,
        orden_data=orden_in,
        user_id=user_id,
        user_email=user_email,
    )


@router.get("/{id}", response_model=OrdenDetailResponse)
def get_orden(
    id: int,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Obtiene el detalle completo de una orden incluyendo datos del cliente,
    datos del motor y la trazabilidad cronológica de historial_estados_orden.
    """
    return orden_service.get_orden_by_id(db=db, orden_id=id)


@router.put("/{id}", response_model=OrdenResponse)
def update_orden(
    id: int,
    orden_in: OrdenUpdate,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Actualiza datos descriptivos o técnicos de una orden existente."""
    return orden_service.update_orden(db=db, orden_id=id, orden_data=orden_in)


@router.patch("/{id}/estado", response_model=OrdenDetailResponse)
def update_orden_estado(
    id: int,
    estado_in: OrdenUpdateEstado,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Actualiza el estado de la orden y genera un nuevo registro en historial_estados_orden
    con usuario_email, estado anterior, estado nuevo y observación técnica.
    """
    user_email = current_user.get("email")
    return orden_service.update_orden_estado(
        db=db,
        orden_id=id,
        estado_data=estado_in,
        user_email=user_email,
    )
