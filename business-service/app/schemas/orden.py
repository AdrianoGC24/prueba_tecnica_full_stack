from datetime import datetime, date
from typing import Optional, List, Literal, Dict
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.cliente import ClienteResponse, ClienteSimpleResponse
from app.schemas.motor import MotorResponse, MotorSimpleResponse

EstadoOrden = Literal[
    'Recibido',
    'En diagnóstico',
    'Esperando aprobación',
    'En reparación',
    'En pruebas',
    'Finalizado',
    'Entregado',
]


class HistorialEstadoResponse(BaseModel):
    id: int
    orden_id: int
    estado_anterior: Optional[str] = None
    estado_nuevo: str
    observacion: Optional[str] = None
    usuario_email: Optional[str] = None
    fecha_cambio: datetime

    model_config = ConfigDict(from_attributes=True)


class OrdenCreate(BaseModel):
    numero_orden: Optional[str] = Field(None, max_length=40)
    motor_id: int
    cliente_id: int
    descripcion_problema: str = Field(..., min_length=5)
    tecnico_responsable: str = Field(..., min_length=2, max_length=120)
    fecha_estimada_entrega: Optional[date] = None
    fecha_real_entrega: Optional[date] = None
    estado: Optional[EstadoOrden] = 'Recibido'
    observaciones: Optional[str] = None
    diagnostico_tecnico: Optional[str] = None
    trabajo_realizado: Optional[str] = None


class OrdenUpdate(BaseModel):
    descripcion_problema: Optional[str] = Field(None, min_length=5)
    tecnico_responsable: Optional[str] = Field(None, min_length=2, max_length=120)
    fecha_estimada_entrega: Optional[date] = None
    fecha_real_entrega: Optional[date] = None
    observaciones: Optional[str] = None
    diagnostico_tecnico: Optional[str] = None
    trabajo_realizado: Optional[str] = None


class OrdenUpdateEstado(BaseModel):
    estado: EstadoOrden
    observacion: Optional[str] = None
    diagnostico_tecnico: Optional[str] = None
    trabajo_realizado: Optional[str] = None
    fecha_real_entrega: Optional[date] = None


class OrdenResponse(BaseModel):
    id: int
    numero_orden: str
    motor_id: int
    cliente_id: int
    fecha_recepcion: datetime
    descripcion_problema: str
    diagnostico_tecnico: Optional[str] = None
    trabajo_realizado: Optional[str] = None
    tecnico_responsable: str
    fecha_estimada_entrega: Optional[date] = None
    fecha_real_entrega: Optional[date] = None
    estado: str
    observaciones: Optional[str] = None
    creado_por_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    cliente: Optional[ClienteSimpleResponse] = None
    motor: Optional[MotorSimpleResponse] = None

    model_config = ConfigDict(from_attributes=True)


class OrdenDetailResponse(OrdenResponse):
    cliente: Optional[ClienteResponse] = None
    motor: Optional[MotorResponse] = None
    historial: List[HistorialEstadoResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ResumenEstadosResponse(BaseModel):
    total: int
    estados: Dict[str, int]
