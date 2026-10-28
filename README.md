# ⚙️ Mining Motors Workshop — Plataforma de Gestión de Reparaciones de Motores de Minería Pesada

[![CI Workflow](https://github.com/empresa/mining-motors/actions/workflows/ci.yml/badge.svg)](https://github.com/empresa/mining-motors/actions)
![Node.js](https://img.shields.io/badge/Node.js-20_Alpine-339933?logo=node.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

Plataforma empresarial de microservicios diseñada para un taller especializado en reparación de motores diésel de maquinaria pesada de extracción minera (Caterpillar, Cummins, Komatsu, MTU). Permite la recepción técnica, trazabilidad cronológica de las 7 fases operativas de mantenimiento, administración de flota de motores, clientes y control de personal autenticado con roles.

---

## 🏗️ 1. Arquitectura de Microservicios

El sistema adopta el patrón de arquitectura **Database-per-Service** para garantizar desacoplamiento estricto, independencia tecnológica y aislamiento de fallos:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR DEL USUARIO                           │
│                                                                        │
│                ┌───────────────────────────────────────┐               │
│                │        FRONTEND (React + Vite)        │               │
│                │        Puerto: 3000                   │               │
│                │        Tecnología: TypeScript         │               │
│                └───────────┬───────────────┬───────────┘               │
│                            │               │                           │
└────────────────────────────┼───────────────┼───────────────────────────┘
                             │               │
             1. Auth / Users │               │ 2. Clientes / Motores / Órdenes
             (:4000/api)     │               │    (:8000/api + Bearer JWT)
                             ▼               ▼
               ┌───────────────────┐   ┌───────────────────────┐
               │   auth-service    │   │   business-service    │
               │   Express + TS    │   │   FastAPI + Python    │
               │   Puerto: 4000    │   │   Puerto: 8000        │
               └─────────┬─────────┘   └───────────┬───────────┘
                         │                         │
                         │ Conexión Exclusiva      │ Conexión Exclusiva
                         ▼                         ▼
               ┌───────────────────────────────────────────────┐
               │      PostgreSQL 15 (Host: 5433 / Red: 5432)   │
               │  ┌─────────────────┐     ┌─────────────────┐  │
               │  │  DB: auth_db    │     │ DB: business_db │  │
               │  │  - users        │     │ - clientes      │  │
               │  │                 │     │ - motores       │  │
               │  │                 │     │ - ordenes_rep.. │  │
               │  │                 │     │ - historial_..  │  │
               │  └─────────────────┘     └─────────────────┘  │
               └───────────────────────────────────────────────┘
```

### Componentes de la Solución
1. **`auth-service` (Node.js 20 + Express + TypeScript)**:
   - Administra cuentas y roles (`admin` y `operativo`).
   - Hashea contraseñas con `bcryptjs` (salt 10).
   - Genera y firma criptográficamente los tokens JWT usando el algoritmo `HS256`.
   - Conectado **únicamente** a la base de datos física `auth_db`.
2. **`business-service` (Python 3.11 + FastAPI + SQLAlchemy + Pydantic v2)**:
   - Gestiona el núcleo de negocio: clientes mineros, inventario de motores y ciclo de vida de órdenes.
   - Valida la firma criptográfica y expiración del JWT en cada petición sin consultar tablas de usuarios.
   - Registra auditoría automática en `historial_estados_orden` cada vez que una orden es creada o cambia de estado.
   - Conectado **únicamente** a la base de datos física `business_db`.
3. **`frontend` (React 18 + TypeScript + Vite)**:
   - Interfaz web industrial responsiva con soporte para las operaciones del taller.
   - Dashboard con contadores en tiempo real por cada uno de los 7 estados y listado de órdenes recientes.
   - Formulario de transición de estado y línea de tiempo cronológica auditada.
4. **PostgreSQL 15**:
   - Aloja dos bases de datos lógicas aisladas (`auth_db` y `business_db`), inicializadas automáticamente mediante `database/init.sql`.

---

## 🗄️ 2. Modelo de Datos Relacional y Aislamiento Físico

El archivo de inicialización `database/init.sql` crea dos bases de datos físicas independientes dentro de la misma instancia de base de datos. Ningún servicio cuenta con permisos ni cadenas de conexión para consultar tablas internas del otro.

### 2.1 Esquema `auth_db` (Exclusivo de `auth-service`)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'operativo' CHECK (rol IN ('admin', 'operativo')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rol_activo ON users(rol, activo);
```

### 2.2 Esquema `business_db` (Exclusivo de `business-service`)
- **`clientes`**: Empresas mineras propietarias. `numero_identificacion` con restricción de unicidad (`UNIQUE`) y tipos de documento permitidos: `'NIT'`, `'CC'`, `'CE'`, `'RUT'`, `'PASAPORTE'`.
- **`motores`**: Maquinaria asociada a un cliente (`FK -> clientes.id ON DELETE RESTRICT`). `numero_serie` único a nivel nacional/internacional (`UNIQUE`).
- **`ordenes_reparacion`**: Contratos de servicio. Valida los 7 estados del taller mediante `CHECK (estado IN ('Recibido', 'En diagnóstico', 'Esperando aprobación', 'En reparación', 'En pruebas', 'Finalizado', 'Entregado'))`.
- **`historial_estados_orden`**: Tabla de trazabilidad de solo anexado (`append-only`). `FK -> ordenes_reparacion(id) ON DELETE CASCADE`. Almacena `estado_anterior`, `estado_nuevo`, `observacion`, `usuario_email` y `fecha_cambio`.

---

## 🔐 3. Seguridad e Integración Criptográfica con JWT

La comunicación segura entre microservicios se fundamenta en un esquema de **Tokens Autocontenidos (Stateless JWT)**:

1. **Emisión en Express (`auth-service`)**:
   Al autenticar credenciales en `POST /api/auth/login`, se firma un token con algoritmo `HS256`, el secreto `JWT_SECRET` y expiración (`JWT_EXPIRES_IN=8h`):
   ```json
   {
     "sub": "1",
     "userId": 1,
     "email": "admin@mineria.com",
     "nombre": "Administrador Principal",
     "rol": "admin",
     "iat": 1700000000,
     "exp": 1700028800
   }
   ```
2. **Validación en FastAPI (`business-service`)**:
   La dependencia `get_current_user` (`app/core/security.py`) intercepta el header `Authorization: Bearer <token>`.
   - Valida criptográficamente la firma con el `JWT_SECRET` compartido y comprueba que `exp > now`.
   - Extrae `userId` y `email` para insertarlos automáticamente en las columnas de auditoría (`creado_por_user_id` y `usuario_email` del historial) **sin necesidad de consultar a `auth_db`**.
   - Si el token está ausente, expiró o fue adulterado, responde de inmediato con `401 Unauthorized`.

---

## 🚀 4. Puesta en Marcha con Docker Compose (Recomendado)

Todo el ecosistema se encuentra listo para ejecutarse en contenedores orquestados con un solo comando:

### Paso 1: Configurar variables de entorno
Copia la plantilla predefinida en la raíz:
```bash
cp .env.example .env
```

### Paso 2: Construir y levantar los 4 contenedores
```bash
docker compose up --build
```

El script `database/init.sql` aprovisionará las dos bases de datos y `auth-service` ejecutará la **semilla automática** para crear el usuario administrador por defecto.

### URLs de acceso:
- 💻 **Frontend Web**: [http://localhost:3000](http://localhost:3000)
- 🔑 **API Auth (Express)**: [http://localhost:4000](http://localhost:4000) (Health: `http://localhost:4000/health`)
- ⚙️ **API Business (FastAPI)**: [http://localhost:8000](http://localhost:8000) (Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs))

### 👤 Credenciales Iniciales de Acceso (Semilla Automática)
- **Correo Electrónico**: `admin@mineria.com`
- **Contraseña**: `Admin123*`
- **Rol**: `admin`
*(El frontend cuenta con un botón **"Autocompletar"** en la pantalla de inicio de sesión para agilizar la prueba técnica).*

---

## 🛠️ 5. Ejecución Local sin Docker (Entorno de Desarrollo)

Si deseas ejecutar cada servicio de forma individual en tu máquina:

### Requisitos Previos
- Node.js 20+ y npm
- Python 3.11+
- Instancia de PostgreSQL 15 corriendo con las bases de datos creadas ejecutando `database/init.sql`.

### 5.1 Servicio de Autenticación (`auth-service`)
```bash
cd auth-service
npm install
npm run build
npm run dev
# Corre en http://localhost:4000
```

### 5.2 Servicio de Negocio (`business-service`)
```bash
cd business-service
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Corre en http://localhost:8000 (Swagger en /docs)
```

### 5.3 Frontend (`frontend`)
```bash
cd frontend
npm install
npm run dev
# Corre en http://localhost:3000
```

---

## 📡 6. Catálogo de Endpoints de la API

### 6.1 `auth-service` (Puerto 4000)
| Método | Endpoint | Descripción | Acceso / Rol |
|---|---|---|---|
| `GET` | `/health` | Healthcheck del servicio Express | Público |
| `POST` | `/api/auth/register` | Registro de nuevo usuario (hashea con bcrypt salt 10) | Público |
| `POST` | `/api/auth/login` | Login con credenciales, emite token JWT | Público |
| `GET` | `/api/auth/me` | Obtiene el perfil del usuario autenticado | Bearer JWT |
| `GET` | `/api/users` | Listado completo de usuarios registrados | Bearer JWT (`admin`) |
| `GET` | `/api/users/:id` | Consulta de usuario por ID | Bearer JWT (`admin` o usuario propio) |
| `PUT` | `/api/users/:id` | Modificación de nombre, email o rol | Bearer JWT (`admin` o usuario propio) |
| `PATCH` | `/api/users/:id/status` | Activar o desactivar cuenta (`activo: boolean`) | Bearer JWT (`admin`) |

### 6.2 `business-service` (Puerto 8000 — Documentación en `/docs`)
*(Todas las rutas `/api/*` requieren Header `Authorization: Bearer <JWT>`)*

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/health` | Healthcheck del servicio FastAPI (Público) |
| `GET` | `/api/clientes` | Lista empresas mineras con filtro opcional `?search=` o `?activo=` |
| `POST` | `/api/clientes` | Crea cliente (valida `numero_identificacion` único -> `409 Conflict`) |
| `GET` | `/api/clientes/{id}` | Obtiene detalle de un cliente |
| `PUT` | `/api/clientes/{id}` | Actualiza datos de un cliente |
| `GET` | `/api/motores` | Lista motores con datos del cliente y filtro `?cliente_id=` |
| `POST` | `/api/motores` | Registra motor (valida cliente existente y `numero_serie` único -> `409`) |
| `GET` | `/api/motores/{id}` | Obtiene ficha técnica del motor |
| `PUT` | `/api/motores/{id}` | Actualiza especificaciones técnicas del motor |
| `GET` | `/api/ordenes/resumen-estados` | Conteo de órdenes por cada uno de los 7 estados para el Dashboard |
| `GET` | `/api/ordenes` | Lista órdenes con filtros combinables (`estado`, `cliente_id`, `motor_id`, `search`) |
| `POST` | `/api/ordenes` | Crea orden (autogenera `ORD-2026-XXXX` y genera 1ra entrada en historial) |
| `GET` | `/api/ordenes/{id}` | Obtiene orden con cliente, motor e historial cronológico completo |
| `PATCH` | `/api/ordenes/{id}/estado` | Transición entre los 7 estados y registro automático en historial |

---

## 🧪 7. Ejecución de Pruebas Automatizadas

El proyecto cuenta con pruebas aisladas que pueden ejecutarse en local o en entornos de Integración Continua sin depender de una base de datos externa:

### Pruebas de `auth-service` (13 pruebas Jest + Supertest)
```bash
cd auth-service
npm test
```
*Valida: healthcheck, registro de usuario, conflicto por duplicados (409), login exitoso, contraseñas incorrectas (401), usuario inactivo (403), consulta de perfil /me, restricción de acceso por rol admin y actualización de estado.*

### Pruebas de `business-service` (9 pruebas Pytest + SQLite in-memory)
```bash
cd business-service
pytest tests/test_business.py -v
```
*Valida: healthcheck, rechazo de peticiones sin token o con token expirado (401), alta de clientes y detección de duplicados (409), catálogo de motores con validación de cliente, autogeneración del identificador `ORD-2026-XXXX`, inserción en `historial_estados_orden`, avance a `'Entregado'` con autoasignación de fecha y conteo de estados para el Dashboard.*

### Compilación y Typecheck de `frontend` (TypeScript + Vite)
```bash
cd frontend
npm run build
```
*Verifica la ausencia de errores de tipado en TypeScript y genera los paquetes estáticos de producción optimizados.*

---

## 🔄 8. Pipeline de Integración Continua (GitHub Actions)

El archivo [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) define 4 trabajos automatizados que se ejecutan ante cada `push` o `pull_request` a las ramas `main` y `feature/**`:

1. **`auth-service-ci`**: Setup Node 20, `npm install`, compilación `tsc` y ejecución de tests en Jest.
2. **`business-service-ci`**: Setup Python 3.11, instalación de dependencias y ejecución de tests con `pytest`.
3. **`frontend-ci`**: Setup Node 20, verificación de tipos y compilación de producción con Vite.
4. **`docker-build-check`**: Valida que las 3 imágenes de Docker construyan limpiamente.
