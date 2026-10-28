from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.db.models import Motor, Cliente
from app.schemas.motor import MotorCreate, MotorUpdate


def list_motores(
    db: Session,
    cliente_id: Optional[int] = None,
    activo: Optional[bool] = None,
) -> List[Motor]:
    query = db.query(Motor).options(joinedload(Motor.cliente))

    if cliente_id is not None:
        query = query.filter(Motor.cliente_id == cliente_id)

    if activo is not None:
        query = query.filter(Motor.activo == activo)

    return query.order_by(Motor.id.desc()).all()


def get_motor_by_id(db: Session, motor_id: int) -> Motor:
    motor = (
        db.query(Motor)
        .options(joinedload(Motor.cliente))
        .filter(Motor.id == motor_id)
        .first()
    )
    if not motor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Motor con ID {motor_id} no encontrado",
        )
    return motor


def create_motor(db: Session, motor_data: MotorCreate) -> Motor:
    # 1. Verificar que el cliente_id exista
    cliente = db.query(Cliente).filter(Cliente.id == motor_data.cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El cliente asociado con ID {motor_data.cliente_id} no existe",
        )

    # 2. Verificar que el numero_serie no esté duplicado
    existing = (
        db.query(Motor)
        .filter(Motor.numero_serie == motor_data.numero_serie.strip())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un motor registrado con el número de serie '{motor_data.numero_serie}'",
        )

    nuevo_motor = Motor(
        numero_serie=motor_data.numero_serie.strip(),
        fabricante=motor_data.fabricante.strip(),
        modelo=motor_data.modelo.strip(),
        tipo_motor=motor_data.tipo_motor.strip(),
        potencia=motor_data.potencia.strip(),
        cliente_id=motor_data.cliente_id,
        fecha_registro=motor_data.fecha_registro or date.today(),
        activo=motor_data.activo,
    )
    db.add(nuevo_motor)
    db.commit()
    db.refresh(nuevo_motor)
    return get_motor_by_id(db, nuevo_motor.id)


def update_motor(
    db: Session,
    motor_id: int,
    motor_data: MotorUpdate,
) -> Motor:
    motor = get_motor_by_id(db, motor_id)

    # Validar cliente si se cambia
    if motor_data.cliente_id is not None and motor_data.cliente_id != motor.cliente_id:
        cliente = db.query(Cliente).filter(Cliente.id == motor_data.cliente_id).first()
        if not cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El cliente con ID {motor_data.cliente_id} no existe",
            )
        motor.cliente_id = motor_data.cliente_id

    # Validar unicidad de número de serie si cambia
    if (
        motor_data.numero_serie is not None
        and motor_data.numero_serie.strip() != motor.numero_serie
    ):
        dup = (
            db.query(Motor)
            .filter(
                Motor.numero_serie == motor_data.numero_serie.strip(),
                Motor.id != motor_id,
            )
            .first()
        )
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El número de serie '{motor_data.numero_serie}' ya está registrado para otro motor",
            )
        motor.numero_serie = motor_data.numero_serie.strip()

    if motor_data.fabricante is not None:
        motor.fabricante = motor_data.fabricante.strip()

    if motor_data.modelo is not None:
        motor.modelo = motor_data.modelo.strip()

    if motor_data.tipo_motor is not None:
        motor.tipo_motor = motor_data.tipo_motor.strip()

    if motor_data.potencia is not None:
        motor.potencia = motor_data.potencia.strip()

    if motor_data.activo is not None:
        motor.activo = motor_data.activo

    db.commit()
    db.refresh(motor)
    return get_motor_by_id(db, motor.id)
