import { userModel, SafeUser, UserRole } from '../models/userModel';
import { AppError } from '../utils/AppError';

export interface UpdateUserInput {
  nombre?: string;
  email?: string;
  rol?: UserRole;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const userService = {
  /**
   * Lista todos los usuarios registrados (exclusivo admin).
   */
  async getAllUsers(): Promise<SafeUser[]> {
    return userModel.findAll();
  },

  /**
   * Obtiene un usuario por ID, verificando permisos (admin o propio usuario).
   */
  async getUserById(
    targetId: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<SafeUser> {
    if (requestingUserRole !== 'admin' && targetId !== requestingUserId) {
      throw new AppError(
        'Acceso denegado: no tiene permisos para consultar este usuario',
        403
      );
    }

    const user = await userModel.findSafeById(targetId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    return user;
  },

  /**
   * Actualiza la información de un usuario.
   */
  async updateUser(
    targetId: number,
    requestingUserId: number,
    requestingUserRole: string,
    data: UpdateUserInput
  ): Promise<SafeUser> {
    if (requestingUserRole !== 'admin' && targetId !== requestingUserId) {
      throw new AppError(
        'Acceso denegado: no tiene permisos para modificar este usuario',
        403
      );
    }

    const existingUser = await userModel.findById(targetId);
    if (!existingUser) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Un usuario no-admin no puede cambiar su propio rol
    if (data.rol && requestingUserRole !== 'admin') {
      throw new AppError(
        'Solo los administradores pueden modificar el rol de un usuario',
        403
      );
    }

    if (data.rol && !['admin', 'operativo'].includes(data.rol)) {
      throw new AppError('El rol debe ser "admin" u "operativo"', 400);
    }

    if (data.nombre !== undefined && (!data.nombre.trim())) {
      throw new AppError('El nombre no puede estar vacío', 400);
    }

    let normalizedEmail: string | undefined = undefined;
    if (data.email !== undefined) {
      if (!EMAIL_REGEX.test(data.email.trim())) {
        throw new AppError('El correo electrónico proporcionado no es válido', 400);
      }
      normalizedEmail = data.email.trim().toLowerCase();

      // Si el email cambió, verificar si ya está ocupado por otro usuario
      if (normalizedEmail !== existingUser.email.toLowerCase()) {
        const emailInUse = await userModel.findByEmail(normalizedEmail);
        if (emailInUse && emailInUse.id !== targetId) {
          throw new AppError('El correo electrónico ya se encuentra registrado por otro usuario', 409);
        }
      }
    }

    const updated = await userModel.update(targetId, {
      nombre: data.nombre ? data.nombre.trim() : undefined,
      email: normalizedEmail,
      rol: data.rol,
    });

    if (!updated) {
      throw new AppError('Error al actualizar el usuario', 500);
    }

    return updated;
  },

  /**
   * Cambia el estado activo/inactivo de un usuario (exclusivo admin).
   */
  async updateUserStatus(
    targetId: number,
    requestingUserId: number,
    activo: boolean
  ): Promise<SafeUser> {
    if (typeof activo !== 'boolean') {
      throw new AppError('El campo "activo" debe ser un valor booleano (true o false)', 400);
    }

    const existingUser = await userModel.findById(targetId);
    if (!existingUser) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Prevenir que el admin se inactive a sí mismo accidentalmente
    if (targetId === requestingUserId && !activo) {
      throw new AppError('No puede desactivar su propia cuenta de administrador', 400);
    }

    const updated = await userModel.updateStatus(targetId, activo);
    if (!updated) {
      throw new AppError('Error al cambiar el estado del usuario', 500);
    }

    return updated;
  },
};
