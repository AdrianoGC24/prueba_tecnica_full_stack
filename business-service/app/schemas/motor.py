from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.cliente import ClienteSimpleResponse


class MotorBase(BaseModel):
    numero_serie: str = Field(..., min_length=2, max_length=80)
    fabricante: str = Field(..., min_length=2, max_length=100)
    modelo: str = Field(..., min_length=1, max_length=100)
    tipo_motor: str = Field(..., min_length=2, max_length=100)
    potencia: str = Field(..., min_length=1, max_length=80)
    cliente_id: int
    activo: bool = True


class MotorCreate(MotorBase):
    fecha_registro: Optional[date] = None


class MotorUpdate(BaseModel):
    numero_serie: Optional[str] = Field(None, min_length=2, max_length=80)
    fabricante: Optional[str] = Field(None, min_length=2, max_length=100)
    modelo: Optional[str] = Field(None, min_length=1, max_length=100)
    tipo_motor: Optional[str] = Field(None, min_length=2, max_length=100)
    potencia: Optional[str] = Field(None, min_length=1, max_length=80)
    cliente_id: Optional[int] = None
    activo: Optional[bool] = None


class MotorSimpleResponse(BaseModel):
    id: int
    numero_serie: str
    fabricante: str
    modelo: str

    model_config = ConfigDict(from_attributes=True)


class MotorResponse(MotorBase):
    id: int
    fecha_registro: date
    created_at: datetime
    updated_at: datetime
    cliente: Optional[ClienteSimpleResponse] = None

    model_config = ConfigDict(from_attributes=True)
