import bcrypt from 'bcryptjs';
import { userModel, SafeUser, UserRole } from '../models/userModel';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';

export interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
  rol?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: UserRole;
    activo: boolean;
    created_at?: Date;
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authService = {
  /**
   * Registra un nuevo usuario en la base de datos.
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
    const { nombre, email, password, rol } = data;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new AppError('El nombre es obligatorio', 400);
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      throw new AppError('Debe proporcionar un correo electrónico válido', 400);
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    }

    if (rol && !['admin', 'operativo'].includes(rol)) {
      throw new AppError('El rol debe ser "admin" u "operativo"', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validar duplicado
    const existingUser = await userModel.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError('El correo electrónico ya se encuentra registrado', 409);
    }

    // Hashear password con salt 10
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const newUser = await userModel.create({
      nombre: nombre.trim(),
      email: normalizedEmail,
      password_hash,
      rol: rol || 'operativo',
    });

    // Generar token JWT con el payload estándar requerido
    const token = signToken({
      sub: String(newUser.id),
      userId: newUser.id,
      email: newUser.email,
      nombre: newUser.nombre,
      rol: newUser.rol,
    });

    return {
      token,
      user: {
        id: newUser.id,
        nombre: newUser.nombre,
        email: newUser.email,
        rol: newUser.rol,
        activo: newUser.activo,
        created_at: newUser.created_at,
      },
    };
  },

  /**
   * Inicia sesión con email y contraseña.
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    const { email, password } = data;

    if (!email || !password) {
      throw new AppError('El correo electrónico y la contraseña son requeridos', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userModel.findByEmail(normalizedEmail);

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (!user.activo) {
      throw new AppError('Usuario inactivo. Contacte al administrador del sistema.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Generar token JWT
    const token = signToken({
      sub: String(user.id),
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    });

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
      },
    };
  },

  /**
   * Obtiene la información del usuario autenticado actual.
   */
  async getMe(userId: number): Promise<SafeUser> {
    const user = await userModel.findSafeById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }
    return user;
  },
};
