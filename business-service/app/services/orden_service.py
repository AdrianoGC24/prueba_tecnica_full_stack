from datetime import date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from app.db.models import (
    OrdenReparacion,
    HistorialEstadoOrden,
    Cliente,
    Motor,
    ESTADOS_VALIDOS,
)
from app.schemas.orden import (
    OrdenCreate,
    OrdenUpdate,
    OrdenUpdateEstado,
)


def get_resumen_estados(db: Session) -> Dict[str, Any]:
    """
    Calcula el conteo de órdenes para cada uno de los 7 estados oficiales más el total.
    """
    conteos_query = (
        db.query(OrdenReparacion.estado, func.count(OrdenReparacion.id))
        .group_by(OrdenReparacion.estado)
        .all()
    )

    conteo_dict = {estado: 0 for estado in ESTADOS_VALIDOS}
    total = 0

    for estado, count in conteos_query:
        if estado in conteo_dict:
            conteo_dict[estado] = count
            total += count

    return {
        "total": total,
        "estados": conteo_dict,
    }


def list_ordenes(
    db: Session,
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    motor_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[OrdenReparacion]:
    query = (
        db.query(OrdenReparacion)
        .options(
            joinedload(OrdenReparacion.cliente),
            joinedload(OrdenReparacion.motor),
        )
    )

    if estado:
        query = query.filter(OrdenReparacion.estado == estado)

    if cliente_id:
        query = query.filter(OrdenReparacion.cliente_id == cliente_id)

    if motor_id:
        query = query.filter(OrdenReparacion.motor_id == motor_id)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                OrdenReparacion.numero_orden.ilike(search_filter),
                OrdenReparacion.tecnico_responsable.ilike(search_filter),
                OrdenReparacion.descripcion_problema.ilike(search_filter),
            )
        )

    return query.order_by(OrdenReparacion.id.desc()).all()


def get_orden_by_id(db: Session, orden_id: int) -> OrdenReparacion:
    orden = (
        db.query(OrdenReparacion)
        .options(
            joinedload(OrdenReparacion.cliente),
            joinedload(OrdenReparacion.motor),
            joinedload(OrdenReparacion.historial),
        )
        .filter(OrdenReparacion.id == orden_id)
        .first()
    )
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de reparación con ID {orden_id} no encontrada",
        )
    return orden


def _generate_numero_orden(db: Session) -> str:
    """Genera un identificador único para la orden en formato ORD-2026-XXXX."""
    total_ordenes = db.query(func.count(OrdenReparacion.id)).scalar() or 0
    next_num = total_ordenes + 1

    while True:
        candidate = f"ORD-2026-{next_num:04d}"
        exists = (
            db.query(OrdenReparacion.id)
            .filter(OrdenReparacion.numero_orden == candidate)
            .first()
        )
        if not exists:
            return candidate
        next_num += 1


def create_orden(
    db: Session,
    orden_data: OrdenCreate,
    user_id: Optional[int],
    user_email: Optional[str],
) -> OrdenReparacion:
    # 1. Validar que el cliente exista
    cliente = db.query(Cliente).filter(Cliente.id == orden_data.cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El cliente asociado con ID {orden_data.cliente_id} no existe",
        )

    # 2. Validar que el motor exista
    motor = db.query(Motor).filter(Motor.id == orden_data.motor_id).first()
    if not motor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El motor asociado con ID {orden_data.motor_id} no existe",
        )

    # 3. Autogenerar o verificar número de orden
    if orden_data.numero_orden and orden_data.numero_orden.strip():
        num_orden = orden_data.numero_orden.strip()
        existing = (
            db.query(OrdenReparacion)
            .filter(OrdenReparacion.numero_orden == num_orden)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El número de orden '{num_orden}' ya se encuentra registrado",
            )
    else:
        num_orden = _generate_numero_orden(db)

    estado_inicial = orden_data.estado or 'Recibido'
    if estado_inicial not in ESTADOS_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inicial inválido. Debe ser uno de: {', '.join(ESTADOS_VALIDOS)}",
        )

    nueva_orden = OrdenReparacion(
        numero_orden=num_orden,
        motor_id=orden_data.motor_id,
        cliente_id=orden_data.cliente_id,
        descripcion_problema=orden_data.descripcion_problema.strip(),
        diagnostico_tecnico=orden_data.diagnostico_tecnico,
        trabajo_realizado=orden_data.trabajo_realizado,
        tecnico_responsable=orden_data.tecnico_responsable.strip(),
        fecha_estimada_entrega=orden_data.fecha_estimada_entrega,
        fecha_real_entrega=orden_data.fecha_real_entrega,
        estado=estado_inicial,
        observaciones=orden_data.observaciones,
        creado_por_user_id=user_id,
    )
    db.add(nueva_orden)
    db.flush()  # Obtener el ID asignado a la nueva orden

    # Inserción obligatoria del registro inicial en historial_estados_orden
    primer_historial = HistorialEstadoOrden(
        orden_id=nueva_orden.id,
        estado_anterior=None,
        estado_nuevo=estado_inicial,
        observacion=orden_data.observaciones or "Orden creada y motor recibido en taller",
        usuario_email=user_email,
    )
    db.add(primer_historial)

    db.commit()
    db.refresh(nueva_orden)
    return get_orden_by_id(db, nueva_orden.id)


def update_orden_estado(
    db: Session,
    orden_id: int,
    estado_data: OrdenUpdateEstado,
    user_email: Optional[str],
) -> OrdenReparacion:
    orden = get_orden_by_id(db, orden_id)

    if estado_data.estado not in ESTADOS_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado '{estado_data.estado}' no es válido. Debe ser uno de: {', '.join(ESTADOS_VALIDOS)}",
        )

    estado_anterior = orden.estado
    orden.estado = estado_data.estado

    # Si pasa a 'Entregado' y no tiene fecha real de entrega, asignar fecha de hoy
    if estado_data.estado == 'Entregado':
        orden.fecha_real_entrega = estado_data.fecha_real_entrega or date.today()
    elif estado_data.fecha_real_entrega:
        orden.fecha_real_entrega = estado_data.fecha_real_entrega

    if estado_data.diagnostico_tecnico is not None:
        orden.diagnostico_tecnico = estado_data.diagnostico_tecnico

    if estado_data.trabajo_realizado is not None:
        orden.trabajo_realizado = estado_data.trabajo_realizado

    # Registrar el cambio en la tabla historial_estados_orden
    obs = estado_data.observacion or f"Cambio de estado de '{estado_anterior}' a '{estado_data.estado}'"
    nuevo_historial = HistorialEstadoOrden(
        orden_id=orden.id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_data.estado,
        observacion=obs,
        usuario_email=user_email,
    )
    db.add(nuevo_historial)

    db.commit()
    db.refresh(orden)
    return get_orden_by_id(db, orden.id)


def update_orden(
    db: Session,
    orden_id: int,
    orden_data: OrdenUpdate,
) -> OrdenReparacion:
    orden = get_orden_by_id(db, orden_id)

    if orden_data.descripcion_problema is not None:
        orden.descripcion_problema = orden_data.descripcion_problema.strip()

    if orden_data.tecnico_responsable is not None:
        orden.tecnico_responsable = orden_data.tecnico_responsable.strip()

    if orden_data.fecha_estimada_entrega is not None:
        orden.fecha_estimada_entrega = orden_data.fecha_estimada_entrega

    if orden_data.fecha_real_entrega is not None:
        orden.fecha_real_entrega = orden_data.fecha_real_entrega

    if orden_data.observaciones is not None:
        orden.observaciones = orden_data.observaciones

    if orden_data.diagnostico_tecnico is not None:
        orden.diagnostico_tecnico = orden_data.diagnostico_tecnico

    if orden_data.trabajo_realizado is not None:
        orden.trabajo_realizado = orden_data.trabajo_realizado

    db.commit()
    db.refresh(orden)
    return get_orden_by_id(db, orden.id)
