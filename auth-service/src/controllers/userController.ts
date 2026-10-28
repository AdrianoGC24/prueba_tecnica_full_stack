import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AppError } from '../utils/AppError';

export const userController = {
  /**
   * GET /api/users
   */
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId)) {
        throw new AppError('El ID de usuario proporcionado no es válido', 400);
      }

      const requestingUserId = req.user!.userId;
      const requestingUserRole = req.user!.rol;

      const user = await userService.getUserById(
        targetId,
        requestingUserId,
        requestingUserRole
      );

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId)) {
        throw new AppError('El ID de usuario proporcionado no es válido', 400);
      }

      const { nombre, email, rol } = req.body;
      const requestingUserId = req.user!.userId;
      const requestingUserRole = req.user!.rol;

      const updatedUser = await userService.updateUser(
        targetId,
        requestingUserId,
        requestingUserRole,
        { nombre, email, rol }
      );

      res.status(200).json({
        message: 'Usuario actualizado exitosamente',
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/users/:id/status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId)) {
        throw new AppError('El ID de usuario proporcionado no es válido', 400);
      }

      const { activo } = req.body;
      const requestingUserId = req.user!.userId;

      const updatedUser = await userService.updateUserStatus(
        targetId,
        requestingUserId,
        activo
      );

      res.status(200).json({
        message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente`,
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
};
