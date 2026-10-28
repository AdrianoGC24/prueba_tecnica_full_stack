import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app';
import { userModel, User, SafeUser } from '../src/models/userModel';
import { signToken } from '../src/utils/jwt';

// Mock del modelo de datos para pruebas aisladas y reproducibles en CI sin base de datos externa
jest.mock('../src/models/userModel');

// Evitar que el pool intente conectarse durante las pruebas
jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  },
  query: jest.fn(),
  initDatabase: jest.fn().mockResolvedValue(undefined),
}));

describe('Auth Service - Suite de Pruebas Unitarias e Integración', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('debe responder 200 OK con el estado del microservicio', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'auth-service',
      });
    });
  });

  describe('POST /api/auth/register', () => {
    const validRegisterPayload = {
      nombre: 'Juan Perez',
      email: 'juan@mineria.com',
      password: 'Password123*',
      rol: 'operativo',
    };

    it('debe registrar un usuario exitosamente (201) y retornar token JWT', async () => {
      (userModel.findByEmail as jest.Mock).mockResolvedValue(null);

      const mockCreatedUser: SafeUser = {
        id: 1,
        nombre: 'Juan Perez',
        email: 'juan@mineria.com',
        rol: 'operativo',
        activo: true,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      };
      (userModel.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        id: 1,
        nombre: 'Juan Perez',
        email: 'juan@mineria.com',
        rol: 'operativo',
        activo: true,
      });
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('debe responder 409 Conflict si el email ya existe', async () => {
      (userModel.findByEmail as jest.Mock).mockResolvedValue({
        id: 2,
        email: 'juan@mineria.com',
      } as User);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterPayload);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('ya se encuentra registrado');
    });

    it('debe responder 400 Bad Request si la contraseña es menor a 6 caracteres', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegisterPayload, password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('al menos 6 caracteres');
    });

    it('debe responder 400 Bad Request si el formato del correo no es válido', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegisterPayload, email: 'correo-invalido' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('correo electrónico válido');
    });
  });

  describe('POST /api/auth/login', () => {
    it('debe iniciar sesión exitosamente (200) con credenciales válidas', async () => {
      const plainPassword = 'Password123*';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const mockDbUser: User = {
        id: 10,
        nombre: 'Carlos Gómez',
        email: 'carlos@mineria.com',
        password_hash: hashedPassword,
        rol: 'operativo',
        activo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (userModel.findByEmail as jest.Mock).mockResolvedValue(mockDbUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@mineria.com', password: plainPassword });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 10,
        nombre: 'Carlos Gómez',
        email: 'carlos@mineria.com',
        rol: 'operativo',
        activo: true,
      });
    });

    it('debe responder 401 si la contraseña es incorrecta', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPass123*', 10);
      const mockDbUser: User = {
        id: 10,
        nombre: 'Carlos Gómez',
        email: 'carlos@mineria.com',
        password_hash: hashedPassword,
        rol: 'operativo',
        activo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (userModel.findByEmail as jest.Mock).mockResolvedValue(mockDbUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@mineria.com', password: 'WrongPassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    it('debe responder 403 si el usuario está inactivo', async () => {
      const mockDbUser: User = {
        id: 12,
        nombre: 'Inactivo User',
        email: 'inactivo@mineria.com',
        password_hash: 'hash',
        rol: 'operativo',
        activo: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (userModel.findByEmail as jest.Mock).mockResolvedValue(mockDbUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inactivo@mineria.com', password: 'Password123*' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Usuario inactivo');
    });
  });

  describe('GET /api/auth/me', () => {
    it('debe responder 200 con el perfil del usuario autenticado por token', async () => {
      const token = signToken({
        sub: '5',
        userId: 5,
        email: 'operador@mineria.com',
        nombre: 'Operador Mina',
        rol: 'operativo',
      });

      const mockUser: SafeUser = {
        id: 5,
        nombre: 'Operador Mina',
        email: 'operador@mineria.com',
        rol: 'operativo',
        activo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (userModel.findSafeById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        ...mockUser,
        created_at: mockUser.created_at.toISOString(),
        updated_at: mockUser.updated_at.toISOString(),
      });
    });

    it('debe responder 401 si no se envía header Authorization', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Token de autenticación no proporcionado');
    });
  });

  describe('GET /api/users (Protegido con rol admin)', () => {
    it('debe permitir a un usuario admin listar todos los usuarios (200)', async () => {
      const adminToken = signToken({
        sub: '1',
        userId: 1,
        email: 'admin@mineria.com',
        nombre: 'Administrador Principal',
        rol: 'admin',
      });

      const mockUsersList: SafeUser[] = [
        {
          id: 1,
          nombre: 'Administrador Principal',
          email: 'admin@mineria.com',
          rol: 'admin',
          activo: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsersList);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body.users.length).toBe(1);
    });

    it('debe responder 403 Forbidden si un usuario operativo intenta listar usuarios', async () => {
      const opToken = signToken({
        sub: '2',
        userId: 2,
        email: 'op@mineria.com',
        nombre: 'Operativo',
        rol: 'operativo',
      });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${opToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Acceso denegado');
    });
  });

  describe('PATCH /api/users/:id/status (Protegido con rol admin)', () => {
    it('debe permitir al admin cambiar el estado de un usuario (200)', async () => {
      const adminToken = signToken({
        sub: '1',
        userId: 1,
        email: 'admin@mineria.com',
        nombre: 'Admin',
        rol: 'admin',
      });

      (userModel.findById as jest.Mock).mockResolvedValue({
        id: 7,
        nombre: 'Usuario A',
        email: 'a@mineria.com',
        activo: true,
      });

      const updatedUser: SafeUser = {
        id: 7,
        nombre: 'Usuario A',
        email: 'a@mineria.com',
        rol: 'operativo',
        activo: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (userModel.updateStatus as jest.Mock).mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/api/users/7/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activo: false });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('desactivado exitosamente');
      expect(response.body.user.activo).toBe(false);
    });
  });
});
