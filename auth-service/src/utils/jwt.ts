import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface JwtUserPayload {
  sub: string;
  userId: number;
  email: string;
  nombre: string;
  rol: 'admin' | 'operativo';
}

/**
 * Firma un token JWT con el payload estándar requerido para auth-service y business-service.
 */
export const signToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: ENV.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, ENV.JWT_SECRET, options);
};

/**
 * Verifica y decodifica un token JWT usando HS256 y JWT_SECRET.
 */
export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, ENV.JWT_SECRET, {
    algorithms: ['HS256'],
  }) as JwtUserPayload;
};
