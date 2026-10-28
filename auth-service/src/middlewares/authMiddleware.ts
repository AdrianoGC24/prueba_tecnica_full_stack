import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtUserPayload } from '../utils/jwt';
import { AppError } from '../utils/AppError';

// Extender la interfaz Request de Express para incluir los datos decodificados del usuario
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

/**
 * Middleware para autenticar peticiones mediante JWT en el header Authorization.
 */
export const authenticateToken = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError('Token de autenticación no proporcionado o formato inválido', 401)
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Token inválido o expirado', 401));
  }
};

/**
 * Middleware para restringir acceso a rutas según el rol del usuario.
 */
export const requireRole = (
  allowedRoles: 'admin' | 'operativo' | ('admin' | 'operativo')[]
) => {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    if (!rolesArray.includes(req.user.rol)) {
      return next(
        new AppError(
          'Acceso denegado: se requieren permisos específicos para esta acción',
          403
        )
      );
    }

    next();
  };
};
