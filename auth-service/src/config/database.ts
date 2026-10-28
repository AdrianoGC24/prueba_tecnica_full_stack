import { Pool, QueryResult, QueryResultRow } from 'pg';
import bcrypt from 'bcryptjs';
import { ENV } from './env';

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

/**
 * Inicializa la base de datos y ejecuta la semilla automática
 * para el usuario administrador por defecto si aún no existe.
 */
export const initDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log(' Conectado exitosamente a PostgreSQL (auth_db)');
    client.release();

    // Semilla inicial automática (Seed)
    const adminEmail = 'admin@mineria.com';
    const checkUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [adminEmail]
    );

    if (checkUser.rowCount === 0) {
      console.log(' Creando usuario administrador por defecto...');
      const defaultPassword = 'Admin123*';
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      await pool.query(
        `INSERT INTO users (nombre, email, password_hash, rol, activo)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'Administrador Principal',
          adminEmail,
          hashedPassword,
          'admin',
          true,
        ]
      );
      console.log(' Usuario administrador creado exitosamente:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${defaultPassword}`);
      console.log(`   Rol: admin`);
    } else {
      console.log(' Usuario administrador por defecto ya existe en la base de datos.');
    }
  } catch (error) {
    console.error(' Error durante la inicialización de la base de datos:', error);
    throw error;
  }
};
