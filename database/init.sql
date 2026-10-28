-- =============================================================================
-- SCRIPT DE INICIALIZACIÓN DE BASES DE DATOS (PostgreSQL)
-- Plataforma de Gestión de Reparaciones de Motores de Minería Pesada
-- =============================================================================
-- Estrategia de Persistencia en Microservicios:
-- Se crean DOS bases de datos físicas independientes dentro de la misma instancia:
--   1. auth_db     -> Exclusiva para el microservicio Express (Usuarios y Roles)
--   2. business_db -> Exclusiva para el microservicio FastAPI (Clientes, Motores, Órdenes)
-- Esto garantiza aislamiento de datos: ningún servicio puede hacer consultas
-- directas a las tablas internas del otro.
-- =============================================================================

CREATE DATABASE auth_db;
CREATE DATABASE business_db;

-- =============================================================================
-- 1. ESQUEMA DE BASE DE DATOS: auth_db (Microservicio Express + TypeScript)
-- =============================================================================
\connect auth_db;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'operativo'
        CHECK (rol IN ('admin', 'operativo')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para auth_db
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rol_activo ON users(rol, activo);


-- =============================================================================
-- 2. ESQUEMA DE BASE DE DATOS: business_db (Microservicio FastAPI + Python)
-- =============================================================================
\connect business_db;

-- 2.1 Tabla de Clientes (Empresas mineras propietarias de los motores)
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo_identificacion VARCHAR(20) NOT NULL
        CHECK (tipo_identificacion IN ('NIT', 'CC', 'CE', 'RUT', 'PASAPORTE')),
    numero_identificacion VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para clientes
CREATE INDEX idx_clientes_numero_id ON clientes(numero_identificacion);
CREATE INDEX idx_clientes_nombre ON clientes(nombre);
CREATE INDEX idx_clientes_activo ON clientes(activo);

-- 2.2 Tabla de Motores (Maquinaria de minería pesada asociada a un cliente)
CREATE TABLE motores (
    id SERIAL PRIMARY KEY,
    numero_serie VARCHAR(80) NOT NULL UNIQUE,
    fabricante VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    tipo_motor VARCHAR(100) NOT NULL,
    potencia VARCHAR(80) NOT NULL,
    cliente_id INTEGER NOT NULL
        REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para motores
CREATE INDEX idx_motores_numero_serie ON motores(numero_serie);
CREATE INDEX idx_motores_cliente_id ON motores(cliente_id);
CREATE INDEX idx_motores_activo ON motores(activo);

-- 2.3 Tabla de Órdenes de Reparación
CREATE TABLE ordenes_reparacion (
    id SERIAL PRIMARY KEY,
    numero_orden VARCHAR(40) NOT NULL UNIQUE,
    motor_id INTEGER NOT NULL
        REFERENCES motores(id) ON DELETE RESTRICT,
    cliente_id INTEGER NOT NULL
        REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha_recepcion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descripcion_problema TEXT NOT NULL,
    diagnostico_tecnico TEXT,
    trabajo_realizado TEXT,
    tecnico_responsable VARCHAR(120) NOT NULL,
    fecha_estimada_entrega DATE,
    fecha_real_entrega DATE,
    estado VARCHAR(40) NOT NULL DEFAULT 'Recibido'
        CHECK (estado IN (
            'Recibido',
            'En diagnóstico',
            'Esperando aprobación',
            'En reparación',
            'En pruebas',
            'Finalizado',
            'Entregado'
        )),
    observaciones TEXT,
    creado_por_user_id INTEGER, -- Referencia lógica al ID del usuario en el JWT (sin FK cruzada entre DBs)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para órdenes de reparación (optimiza Dashboard y filtros por estado, cliente y motor)
CREATE INDEX idx_ordenes_numero_orden ON ordenes_reparacion(numero_orden);
CREATE INDEX idx_ordenes_estado ON ordenes_reparacion(estado);
CREATE INDEX idx_ordenes_cliente_id ON ordenes_reparacion(cliente_id);
CREATE INDEX idx_ordenes_motor_id ON ordenes_reparacion(motor_id);
CREATE INDEX idx_ordenes_fecha_recepcion ON ordenes_reparacion(fecha_recepcion DESC);

-- 2.4 Tabla de Historial de Estados de la Orden (Trazabilidad / Auditoría del ciclo de vida)
CREATE TABLE historial_estados_orden (
    id SERIAL PRIMARY KEY,
    orden_id INTEGER NOT NULL
        REFERENCES ordenes_reparacion(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(40),
    estado_nuevo VARCHAR(40) NOT NULL,
    observacion TEXT,
    usuario_email VARCHAR(150), -- Extraído del payload del JWT al cambiar estado
    fecha_cambio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para consultar el historial de una orden rápidamente
CREATE INDEX idx_historial_orden_id ON historial_estados_orden(orden_id, fecha_cambio DESC);
