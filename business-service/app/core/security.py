from typing import Any, Dict
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

# HTTPBearer sin lanzar error automático para controlar el formato del mensaje y código HTTP
security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
) -> Dict[str, Any]:
    """
    Valida el token JWT recibido en el header 'Authorization: Bearer <token>'.
    Verifica firma con JWT_SECRET y JWT_ALGORITHM, vigencia temporal y extrae el payload.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación no proporcionado o formato inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub"]}
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de autenticación ha expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # El payload contiene: sub, userId, email, nombre, rol
    # Garantizar que userId esté numérico si sub o userId vienen
    user_id = payload.get("userId")
    if user_id is None and payload.get("sub"):
        try:
            user_id = int(payload["sub"])
        except ValueError:
            user_id = payload["sub"]

    return {
        "userId": user_id,
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "nombre": payload.get("nombre"),
        "rol": payload.get("rol"),
    }
