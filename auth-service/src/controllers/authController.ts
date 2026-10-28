import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export const authController = {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nombre, email, password, rol } = req.body;
      const result = await authService.register({
        nombre,
        email,
        password,
        rol,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await authService.getMe(userId);

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },
};
