import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './middlewares/errorMiddleware';
import { AppError } from './utils/AppError';

export const createApp = (): Application => {
  const app = express();

  // Middlewares de seguridad y parsing
  app.use(
    cors({
      origin: ENV.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());

  // Healthcheck endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'auth-service',
    });
  });

  // Rutas principales de la API
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);

  // Manejo de rutas inexistentes (404)
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Ruta no encontrada en el servicio de autenticación', 404));
  });

  // Middleware global de manejo de errores
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
