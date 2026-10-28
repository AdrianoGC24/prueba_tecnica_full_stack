from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user
from app.schemas.motor import MotorCreate, MotorUpdate, MotorResponse
from app.services import motor_service

router = APIRouter(
    prefix="/motores",
    tags=["Motores"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=List[MotorResponse])
def get_motores(
    cliente_id: Optional[int] = Query(None, description="Filtrar por ID de cliente propietario"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lista todos los motores registrados de minería pesada."""
    return motor_service.list_motores(db=db, cliente_id=cliente_id, activo=activo)


@router.post("", response_model=MotorResponse, status_code=status.HTTP_201_CREATED)
def create_motor(
    motor_in: MotorCreate,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Registra un nuevo motor, validando que el cliente exista y el número de serie sea único."""
    return motor_service.create_motor(db=db, motor_data=motor_in)


@router.get("/{id}", response_model=MotorResponse)
def get_motor(
    id: int,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtiene los datos de un motor por su ID."""
    return motor_service.get_motor_by_id(db=db, motor_id=id)


@router.put("/{id}", response_model=MotorResponse)
def update_motor(
    id: int,
    motor_in: MotorUpdate,
    db: Session = Depends(get_db),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Actualiza la información técnica de un motor."""
    return motor_service.update_motor(db=db, motor_id=id, motor_data=motor_in)
