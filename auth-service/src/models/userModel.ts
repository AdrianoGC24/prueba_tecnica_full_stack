import { query } from '../config/database';

export type UserRole = 'admin' | 'operativo';

export interface User {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: UserRole;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = Omit<User, 'password_hash'>;

export interface CreateUserData {
  nombre: string;
  email: string;
  password_hash: string;
  rol?: UserRole;
}

export interface UpdateUserData {
  nombre?: string;
  email?: string;
  rol?: UserRole;
}

export const userModel = {
  /**
   * Busca un usuario por su correo electrónico (incluyendo password_hash para autenticación).
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Busca un usuario por su ID (incluyendo password_hash).
   */
  async findById(id: number): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Busca un usuario por su ID sin exponer password_hash.
   */
  async findSafeById(id: number): Promise<SafeUser | null> {
    const result = await query<SafeUser>(
      `SELECT id, nombre, email, rol, activo, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene la lista completa de usuarios sin exponer password_hash.
   */
  async findAll(): Promise<SafeUser[]> {
    const result = await query<SafeUser>(
      `SELECT id, nombre, email, rol, activo, created_at, updated_at
       FROM users
       ORDER BY id ASC`
    );
    return result.rows;
  },

  /**
   * Crea un nuevo usuario y retorna sus datos seguros.
   */
  async create(data: CreateUserData): Promise<SafeUser> {
    const rol = data.rol || 'operativo';
    const result = await query<SafeUser>(
      `INSERT INTO users (nombre, email, password_hash, rol, activo)
       VALUES ($1, LOWER($2), $3, $4, TRUE)
       RETURNING id, nombre, email, rol, activo, created_at, updated_at`,
      [data.nombre, data.email, data.password_hash, rol]
    );
    return result.rows[0];
  },

  /**
   * Actualiza los datos permitidos de un usuario (nombre, email, rol).
   */
  async update(id: number, data: UpdateUserData): Promise<SafeUser | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.email !== undefined) {
      updates.push(`email = LOWER($${paramIndex++})`);
      values.push(data.email);
    }

    if (data.rol !== undefined) {
      updates.push(`rol = $${paramIndex++}`);
      values.push(data.rol);
    }

    if (updates.length === 0) {
      return this.findSafeById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const queryText = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, nombre, email, rol, activo, created_at, updated_at
    `;

    const result = await query<SafeUser>(queryText, values);
    return result.rows[0] || null;
  },

  /**
   * Activa o desactiva un usuario por ID.
   */
  async updateStatus(id: number, activo: boolean): Promise<SafeUser | null> {
    const result = await query<SafeUser>(
      `UPDATE users
       SET activo = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, nombre, email, rol, activo, created_at, updated_at`,
      [activo, id]
    );
    return result.rows[0] || null;
  },
};
