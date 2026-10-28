import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de usuarios requieren token de autenticación
router.use(authenticateToken);

// Solo el rol admin puede listar todos los usuarios
router.get('/', requireRole('admin'), userController.getAll);

// Consultar usuario por ID (admin o propio usuario)
router.get('/:id', userController.getById);

// Actualizar usuario (admin o propio usuario)
router.put('/:id', userController.update);

// Activar/desactivar usuario (exclusivo admin)
router.patch('/:id/status', requireRole('admin'), userController.updateStatus);

export default router;
