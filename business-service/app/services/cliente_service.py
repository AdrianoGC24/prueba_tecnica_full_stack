from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.db.models import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate


def list_clientes(
    db: Session,
    search: Optional[str] = None,
    activo: Optional[bool] = None,
) -> List[Cliente]:
    query = db.query(Cliente)

    if activo is not None:
        query = query.filter(Cliente.activo == activo)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Cliente.nombre.ilike(search_filter),
                Cliente.numero_identificacion.ilike(search_filter),
                Cliente.email.ilike(search_filter),
            )
        )

    return query.order_by(Cliente.id.desc()).all()


def get_cliente_by_id(db: Session, cliente_id: int) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente con ID {cliente_id} no encontrado",
        )
    return cliente


def create_cliente(db: Session, cliente_data: ClienteCreate) -> Cliente:
    # Validar unicidad del número de identificación
    existing = (
        db.query(Cliente)
        .filter(Cliente.numero_identificacion == cliente_data.numero_identificacion.strip())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un cliente registrado con el número de identificación '{cliente_data.numero_identificacion}'",
        )

    nuevo_cliente = Cliente(
        nombre=cliente_data.nombre.strip(),
        tipo_identificacion=cliente_data.tipo_identificacion,
        numero_identificacion=cliente_data.numero_identificacion.strip(),
        email=cliente_data.email.strip().lower(),
        activo=cliente_data.activo,
    )
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente


def update_cliente(
    db: Session,
    cliente_id: int,
    cliente_data: ClienteUpdate,
) -> Cliente:
    cliente = get_cliente_by_id(db, cliente_id)

    # Validar si el nuevo número de identificación ya existe en otro registro
    if (
        cliente_data.numero_identificacion
        and cliente_data.numero_identificacion.strip() != cliente.numero_identificacion
    ):
        dup = (
            db.query(Cliente)
            .filter(
                Cliente.numero_identificacion == cliente_data.numero_identificacion.strip(),
                Cliente.id != cliente_id,
            )
            .first()
        )
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El número de identificación '{cliente_data.numero_identificacion}' ya está en uso por otro cliente",
            )
        cliente.numero_identificacion = cliente_data.numero_identificacion.strip()

    if cliente_data.nombre is not None:
        cliente.nombre = cliente_data.nombre.strip()

    if cliente_data.tipo_identificacion is not None:
        cliente.tipo_identificacion = cliente_data.tipo_identificacion

    if cliente_data.email is not None:
        cliente.email = cliente_data.email.strip().lower()

    if cliente_data.activo is not None:
        cliente.activo = cliente_data.activo

    db.commit()
    db.refresh(cliente)
    return cliente
