from datetime import datetime, date
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    Date,
    DateTime,
    ForeignKey,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


ESTADOS_VALIDOS = (
    'Recibido',
    'En diagnóstico',
    'Esperando aprobación',
    'En reparación',
    'En pruebas',
    'Finalizado',
    'Entregado',
)

TIPOS_IDENTIFICACION_VALIDOS = ('NIT', 'CC', 'CE', 'RUT', 'PASAPORTE')


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, index=True)
    tipo_identificacion = Column(String(20), nullable=False)
    numero_identificacion = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(150), nullable=False)
    activo = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            f"tipo_identificacion IN {TIPOS_IDENTIFICACION_VALIDOS}",
            name="chk_cliente_tipo_id",
        ),
    )

    # Relaciones
    motores = relationship("Motor", back_populates="cliente")
    ordenes = relationship("OrdenReparacion", back_populates="cliente")


class Motor(Base):
    __tablename__ = "motores"

    id = Column(Integer, primary_key=True, index=True)
    numero_serie = Column(String(80), nullable=False, unique=True, index=True)
    fabricante = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    tipo_motor = Column(String(100), nullable=False)
    potencia = Column(String(80), nullable=False)
    cliente_id = Column(
        Integer,
        ForeignKey("clientes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    fecha_registro = Column(
        Date,
        nullable=False,
        server_default=func.current_date(),
    )
    activo = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relaciones
    cliente = relationship("Cliente", back_populates="motores")
    ordenes = relationship("OrdenReparacion", back_populates="motor")


class OrdenReparacion(Base):
    __tablename__ = "ordenes_reparacion"

    id = Column(Integer, primary_key=True, index=True)
    numero_orden = Column(String(40), nullable=False, unique=True, index=True)
    motor_id = Column(
        Integer,
        ForeignKey("motores.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    cliente_id = Column(
        Integer,
        ForeignKey("clientes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    fecha_recepcion = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    descripcion_problema = Column(Text, nullable=False)
    diagnostico_tecnico = Column(Text, nullable=True)
    trabajo_realizado = Column(Text, nullable=True)
    tecnico_responsable = Column(String(120), nullable=False)
    fecha_estimada_entrega = Column(Date, nullable=True)
    fecha_real_entrega = Column(Date, nullable=True)
    estado = Column(
        String(40),
        nullable=False,
        default="Recibido",
        index=True,
    )
    observaciones = Column(Text, nullable=True)
    creado_por_user_id = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            f"estado IN {ESTADOS_VALIDOS}",
            name="chk_orden_estado",
        ),
    )

    # Relaciones
    cliente = relationship("Cliente", back_populates="ordenes")
    motor = relationship("Motor", back_populates="ordenes")
    historial = relationship(
        "HistorialEstadoOrden",
        back_populates="orden",
        cascade="all, delete-orphan",
        order_by="HistorialEstadoOrden.fecha_cambio.asc()",
    )


class HistorialEstadoOrden(Base):
    __tablename__ = "historial_estados_orden"

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(
        Integer,
        ForeignKey("ordenes_reparacion.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    estado_anterior = Column(String(40), nullable=True)
    estado_nuevo = Column(String(40), nullable=False)
    observacion = Column(Text, nullable=True)
    usuario_email = Column(String(150), nullable=True)
    fecha_cambio = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relaciones
    orden = relationship("OrdenReparacion", back_populates="historial")
