import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ENV } from '../config/env';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Manejo de errores específicos de PostgreSQL
  if (err.code === '23505') {
    // Unique violation
    statusCode = 409;
    message = 'El registro ya existe en el sistema (conflicto de datos únicos).';
  } else if (err.code === '23502') {
    // Not null violation
    statusCode = 400;
    message = 'Faltan campos obligatorios requeridos por la base de datos.';
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    message = 'Violación de clave foránea en la base de datos.';
  }

  // Si no es un error operacional controlado y estamos en desarrollo, imprimir traza
  if (!err.isOperational && ENV.NODE_ENV !== 'test') {
    console.error(' [ERROR INESPERADO]:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
