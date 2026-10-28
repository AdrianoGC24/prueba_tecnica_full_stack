export type UserRole = 'admin' | 'operativo';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type TipoIdentificacion = 'NIT' | 'CC' | 'CE' | 'RUT' | 'PASAPORTE';

export interface Cliente {
  id: number;
  nombre: string;
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
  email: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClienteSimple {
  id: number;
  nombre: string;
  numero_identificacion: string;
}

export interface Motor {
  id: number;
  numero_serie: string;
  fabricante: string;
  modelo: string;
  tipo_motor: string;
  potencia: string;
  cliente_id: number;
  fecha_registro: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  cliente?: ClienteSimple;
}

export type EstadoOrden =
  | 'Recibido'
  | 'En diagnóstico'
  | 'Esperando aprobación'
  | 'En reparación'
  | 'En pruebas'
  | 'Finalizado'
  | 'Entregado';

export const ESTADOS_ORDEN_LISTA: EstadoOrden[] = [
  'Recibido',
  'En diagnóstico',
  'Esperando aprobación',
  'En reparación',
  'En pruebas',
  'Finalizado',
  'Entregado',
];

export interface HistorialEstado {
  id: number;
  orden_id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  observacion: string | null;
  usuario_email: string | null;
  fecha_cambio: string;
}

export interface OrdenReparacion {
  id: number;
  numero_orden: string;
  motor_id: number;
  cliente_id: number;
  fecha_recepcion: string;
  descripcion_problema: string;
  diagnostico_tecnico?: string | null;
  trabajo_realizado?: string | null;
  tecnico_responsable: string;
  fecha_estimada_entrega?: string | null;
  fecha_real_entrega?: string | null;
  estado: EstadoOrden;
  observaciones?: string | null;
  creado_por_user_id?: number | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  motor?: Motor;
  historial?: HistorialEstado[];
}

export interface ResumenEstados {
  total: number;
  estados: {
    [key in EstadoOrden]?: number;
  } & Record<string, number>;
}
