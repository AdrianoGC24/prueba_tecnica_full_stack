import { app } from './app';
import { ENV } from './config/env';
import { initDatabase, pool } from './config/database';

const startServer = async (): Promise<void> => {
  try {
    console.log('🚀 Iniciando auth-service...');
    
    // Conectar a la base de datos e insertar seed de admin si es necesario
    await initDatabase();

    const server = app.listen(ENV.PORT, () => {
      console.log(`=======================================================`);
      console.log(` auth-service escuchando en el puerto ${ENV.PORT}`);
      console.log(` Entorno: ${ENV.NODE_ENV}`);
      console.log(` Healthcheck: http://localhost:${ENV.PORT}/health`);
      console.log(` Auth API: http://localhost:${ENV.PORT}/api/auth`);
      console.log(` Users API: http://localhost:${ENV.PORT}/api/users`);
      console.log(`=======================================================`);
    });

    // Manejo elegante de apagado
    const shutdown = async (signal: string) => {
      console.log(`\n Señal ${signal} recibida. Cerrando auth-service limpiamente...`);
      server.close(async () => {
        try {
          await pool.end();
          console.log(' Pool de conexiones a PostgreSQL cerrado.');
          process.exit(0);
        } catch (err) {
          console.error(' Error al cerrar el pool de conexiones:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Error fatal al iniciar el microservicio auth-service:', error);
    process.exit(1);
  }
};

startServer();
