from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict

TipoIdentificacion = Literal['NIT', 'CC', 'CE', 'RUT', 'PASAPORTE']


class ClienteBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    tipo_identificacion: TipoIdentificacion
    numero_identificacion: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    activo: bool = True


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    tipo_identificacion: Optional[TipoIdentificacion] = None
    numero_identificacion: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    activo: Optional[bool] = None


class ClienteResponse(ClienteBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClienteSimpleResponse(BaseModel):
    id: int
    nombre: str
    numero_identificacion: str

    model_config = ConfigDict(from_attributes=True)
