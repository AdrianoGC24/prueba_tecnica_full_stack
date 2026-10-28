import pytest
from datetime import datetime, timedelta, timezone
import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.config import settings
from app.db.database import Base, get_db

# Motor SQLite en memoria aislado para pruebas unitarias e integración en CI
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def generate_test_token(user_id: int = 1, email: str = "tecnico@mineria.com", rol: str = "operativo", expires_delta: timedelta = timedelta(hours=1)) -> str:
    """Genera un token JWT firmado compatible con el estándar de la plataforma."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "userId": user_id,
        "email": email,
        "nombre": "Técnico Pruebas",
        "rol": rol,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@pytest.fixture(autouse=True)
def setup_database():
    """Crea las tablas antes de cada test y las elimina al finalizar."""
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


# ==============================================================================
# 1. Pruebas de Healthcheck y Autenticación JWT
# ==============================================================================

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "business-service"}


def test_protected_routes_without_token():
    response = client.get("/api/clientes")
    assert response.status_code == 401
    assert "Token de autenticación no proporcionado" in response.json()["detail"]


def test_protected_routes_with_expired_token():
    expired_token = generate_test_token(expires_delta=timedelta(hours=-2))
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/clientes", headers=headers)
    assert response.status_code == 401
    assert "ha expirado" in response.json()["detail"]


def test_protected_routes_with_invalid_token():
    headers = {"Authorization": "Bearer token_invalido_falso"}
    response = client.get("/api/clientes", headers=headers)
    assert response.status_code == 401
    assert "inválido" in response.json()["detail"]


# ==============================================================================
# 2. Pruebas del Módulo de Clientes
# ==============================================================================

def test_crear_cliente_y_evitar_duplicados():
    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}

    cliente_payload = {
        "nombre": "Cerrejón Minería S.A.",
        "tipo_identificacion": "NIT",
        "numero_identificacion": "900123456-1",
        "email": "contacto@cerrejon.com",
        "activo": True,
    }

    # 1. Creación exitosa
    res_crear = client.post("/api/clientes", json=cliente_payload, headers=headers)
    assert res_crear.status_code == 201
    data = res_crear.json()
    assert data["nombre"] == cliente_payload["nombre"]
    assert data["numero_identificacion"] == cliente_payload["numero_identificacion"]
    assert "id" in data

    # 2. Intento de crear con el mismo número de identificación -> 409 Conflict
    res_dup = client.post("/api/clientes", json=cliente_payload, headers=headers)
    assert res_dup.status_code == 409
    assert "Ya existe un cliente registrado" in res_dup.json()["detail"]


def test_listar_y_buscar_clientes():
    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/clientes", json={
        "nombre": "Drummond Ltd",
        "tipo_identificacion": "NIT",
        "numero_identificacion": "800987654-2",
        "email": "info@drummond.com",
    }, headers=headers)

    res_list = client.get("/api/clientes?search=Drummond", headers=headers)
    assert res_list.status_code == 200
    clientes = res_list.json()
    assert len(clientes) == 1
    assert clientes[0]["nombre"] == "Drummond Ltd"


# ==============================================================================
# 3. Pruebas del Módulo de Motores
# ==============================================================================

def test_crear_motor_validaciones():
    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Crear cliente previo
    res_cliente = client.post("/api/clientes", json={
        "nombre": "Minas Paz del Río",
        "tipo_identificacion": "NIT",
        "numero_identificacion": "860001000-5",
        "email": "minas@pazdelrio.com",
    }, headers=headers)
    cliente_id = res_cliente.json()["id"]

    # 2. Crear motor con cliente no existente -> 404
    motor_invalido = {
        "numero_serie": "CAT-C175-9999",
        "fabricante": "Caterpillar",
        "modelo": "C175-16",
        "tipo_motor": "Diesel V16 Turbo",
        "potencia": "3500 HP",
        "cliente_id": 99999,
    }
    res_invalido = client.post("/api/motores", json=motor_invalido, headers=headers)
    assert res_invalido.status_code == 404

    # 3. Crear motor exitoso
    motor_valido = {
        **motor_invalido,
        "cliente_id": cliente_id,
        "numero_serie": "CAT-C175-001A",
    }
    res_motor = client.post("/api/motores", json=motor_valido, headers=headers)
    assert res_motor.status_code == 201
    motor_data = res_motor.json()
    assert motor_data["numero_serie"] == "CAT-C175-001A"
    assert motor_data["cliente"]["id"] == cliente_id

    # 4. Rechazar duplicado de número de serie -> 409
    res_dup = client.post("/api/motores", json=motor_valido, headers=headers)
    assert res_dup.status_code == 409
    assert "Ya existe un motor registrado" in res_dup.json()["detail"]


# ==============================================================================
# 4. Pruebas de Órdenes de Reparación y Trazabilidad de Historial
# ==============================================================================

def test_ciclo_de_vida_orden_con_historial_automatico():
    token = generate_test_token(user_id=42, email="operador1@mineria.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Preparar cliente y motor
    res_cliente = client.post("/api/clientes", json={
        "nombre": "Argos Minería",
        "tipo_identificacion": "NIT",
        "numero_identificacion": "890100200-3",
        "email": "mantenimiento@argos.co",
    }, headers=headers)
    cliente_id = res_cliente.json()["id"]

    res_motor = client.post("/api/motores", json={
        "numero_serie": "KUM-QSK60-888",
        "fabricante": "Cummins",
        "modelo": "QSK60",
        "tipo_motor": "Diesel Minero Heavy Duty",
        "potencia": "2700 HP",
        "cliente_id": cliente_id,
    }, headers=headers)
    motor_id = res_motor.json()["id"]

    # 1. Crear Orden de Reparación (debe autogenerar número ORD-2026-XXXX y primer historial)
    orden_payload = {
        "cliente_id": cliente_id,
        "motor_id": motor_id,
        "descripcion_problema": "Pérdida de compresión en banco de cilindros izquierdo y fuga de refrigerante",
        "tecnico_responsable": "Ing. Roberto Salazar",
        "observaciones": "Ingresado desde mina a cielo abierto",
    }
    res_orden = client.post("/api/ordenes", json=orden_payload, headers=headers)
    assert res_orden.status_code == 201
    orden_creada = res_orden.json()
    assert orden_creada["numero_orden"].startswith("ORD-2026-")
    assert orden_creada["estado"] == "Recibido"
    assert orden_creada["creado_por_user_id"] == 42
    orden_id = orden_creada["id"]

    # 2. Consultar detalle de la orden -> debe incluir historial inicial
    res_detalle = client.get(f"/api/ordenes/{orden_id}", headers=headers)
    assert res_detalle.status_code == 200
    detalle = res_detalle.json()
    assert len(detalle["historial"]) == 1
    primer_historial = detalle["historial"][0]
    assert primer_historial["estado_anterior"] is None
    assert primer_historial["estado_nuevo"] == "Recibido"
    assert primer_historial["usuario_email"] == "operador1@mineria.com"

    # 3. Transicionar estado a 'En diagnóstico'
    res_diag = client.patch(
        f"/api/ordenes/{orden_id}/estado",
        json={
            "estado": "En diagnóstico",
            "observacion": "Desarme parcial iniciado para pruebas de inyectores",
            "diagnostico_tecnico": "Fallo en empaquetadura de culata cilindro 4",
        },
        headers=headers,
    )
    assert res_diag.status_code == 200
    orden_diag = res_diag.json()
    assert orden_diag["estado"] == "En diagnóstico"
    assert orden_diag["diagnostico_tecnico"] == "Fallo en empaquetadura de culata cilindro 4"
    assert len(orden_diag["historial"]) == 2
    segundo_historial = orden_diag["historial"][1]
    assert segundo_historial["estado_anterior"] == "Recibido"
    assert segundo_historial["estado_nuevo"] == "En diagnóstico"

    # 4. Transicionar estado a 'Entregado' (debe autoasignar fecha_real_entrega si no viene)
    res_entregado = client.patch(
        f"/api/ordenes/{orden_id}/estado",
        json={
            "estado": "Entregado",
            "observacion": "Motor ensamblado, probado en banco de potencia y despachado al cliente",
            "trabajo_realizado": "Reemplazo de culatas y calibración de banco de inyección",
        },
        headers=headers,
    )
    assert res_entregado.status_code == 200
    orden_entregada = res_entregado.json()
    assert orden_entregada["estado"] == "Entregado"
    assert orden_entregada["fecha_real_entrega"] is not None
    assert len(orden_entregada["historial"]) == 3

    # 5. Probar el endpoint de resumen de estados para el Dashboard
    res_resumen = client.get("/api/ordenes/resumen-estados", headers=headers)
    assert res_resumen.status_code == 200
    resumen = res_resumen.json()
    assert resumen["total"] == 1
    assert resumen["estados"]["Entregado"] == 1
    assert resumen["estados"]["Recibido"] == 0

    # 6. Probar listado con filtros
    res_filtro = client.get(f"/api/ordenes?estado=Entregado&cliente_id={cliente_id}", headers=headers)
    assert res_filtro.status_code == 200
    assert len(res_filtro.json()) == 1

    # 7. Intentar cambiar a un estado inválido -> 400 Bad Request
    res_invalido = client.patch(
        f"/api/ordenes/{orden_id}/estado",
        json={"estado": "EstadoInexistente"},
        headers=headers,
    )
    assert res_invalido.status_code == 400 or res_invalido.status_code == 422


def test_actualizaciones_y_filtros():
    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Crear cliente
    res_cliente = client.post("/api/clientes", json={
        "nombre": "Empresa Minera Norte",
        "tipo_identificacion": "RUT",
        "numero_identificacion": "700100200-1",
        "email": "norte@minera.com",
    }, headers=headers)
    cliente_id = res_cliente.json()["id"]

    # Actualizar cliente
    res_put_cli = client.put(f"/api/clientes/{cliente_id}", json={
        "nombre": "Empresa Minera Norte S.A.S.",
        "email": "contacto@mineranorte.com",
    }, headers=headers)
    assert res_put_cli.status_code == 200
    assert res_put_cli.json()["nombre"] == "Empresa Minera Norte S.A.S."

    # Crear motor
    res_motor = client.post("/api/motores", json={
        "numero_serie": "KOM-SAA12V-01",
        "fabricante": "Komatsu",
        "modelo": "SAA12V140E-3",
        "tipo_motor": "Diesel V12",
        "potencia": "1200 HP",
        "cliente_id": cliente_id,
    }, headers=headers)
    motor_id = res_motor.json()["id"]

    # Actualizar motor
    res_put_motor = client.put(f"/api/motores/{motor_id}", json={
        "potencia": "1250 HP",
    }, headers=headers)
    assert res_put_motor.status_code == 200
    assert res_put_motor.json()["potencia"] == "1250 HP"

    # Listar motores filtrando por cliente_id
    res_motores_filtro = client.get(f"/api/motores?cliente_id={cliente_id}", headers=headers)
    assert res_motores_filtro.status_code == 200
    assert len(res_motores_filtro.json()) == 1
