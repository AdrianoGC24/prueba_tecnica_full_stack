from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from app.services import cliente_service

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=List[ClienteResponse])
def get_clientes(
    search: Optional[str] = Query(None, description="Buscar por nombre, número de identificación o email"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lista todos los clientes registrados con soporte para búsqueda y filtrado."""
    return cliente_service.list_clientes(db=db, search=search, activo=activo)


@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def create_cliente(
    cliente_in: ClienteCreate,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Crea una nueva empresa minera cliente, validando número de identificación único."""
    return cliente_service.create_cliente(db=db, cliente_data=cliente_in)


@router.get("/{id}", response_model=ClienteResponse)
def get_cliente(
    id: int,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtiene la información detallada de un cliente por su ID."""
    return cliente_service.get_cliente_by_id(db=db, cliente_id=id)


@router.put("/{id}", response_model=ClienteResponse)
def update_cliente(
    id: int,
    cliente_in: ClienteUpdate,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Actualiza los datos de un cliente existente."""
    return cliente_service.update_cliente(db=db, cliente_id=id, cliente_data=cliente_in)
