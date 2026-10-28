import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { Wrench, Shield, KeyRound, Mail, User as UserIcon, AlertCircle } from 'lucide-react';
import { AlertMessage } from '../components/common/AlertMessage';

export const LoginPage: React.FC = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<'operativo' | 'admin'>('operativo');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickAdmin = () => {
    setEmail('admin@mineria.com');
    setPassword('Admin123*');
    setIsRegisterMode(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        const response = await authApi.post('/auth/register', {
          nombre,
          email,
          password,
          rol,
        });
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      } else {
        const response = await authApi.post('/auth/login', {
          email,
          password,
        });
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Error de conexión con el servicio de autenticación';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at top, #1e293b 0%, #090d16 100%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#0f172a',
        border: '1px solid #23314d',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
      }}>
        {/* Header con Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.85rem',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '12px',
            color: '#0f172a',
            marginBottom: '1rem',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.35)',
          }}>
            <Wrench size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
            MINING MOTORS
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Plataforma de Reparación de Motores Pesados
          </p>
        </div>

        {/* Tarjeta de credenciales de prueba para la sustentación */}
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px dashed #f59e0b',
          borderRadius: '8px',
          padding: '0.9rem 1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
              Credenciales de Sustentación
            </span>
            <button
              type="button"
              onClick={handleQuickAdmin}
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Autocompletar
            </button>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
            <div><strong>Email:</strong> admin@mineria.com</div>
            <div><strong>Password:</strong> Admin123* (Rol: admin)</div>
          </div>
        </div>

        {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Ej. Ing. Carlos Mendoza"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
                <UserIcon size={18} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="usuario@mineria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <KeyRound size={18} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label className="form-label">Rol de Usuario</label>
              <select
                className="form-select"
                value={rol}
                onChange={(e) => setRol(e.target.value as 'operativo' | 'admin')}
              >
                <option value="operativo">Operativo (Técnico / Inspector)</option>
                <option value="admin">Administrador Principal</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '0.8rem' }}
          >
            {loading ? (
              'Procesando...'
            ) : isRegisterMode ? (
              'Crear Cuenta'
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          {isRegisterMode ? (
            <span>
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => { setIsRegisterMode(false); setError(null); }}
                style={{ background: 'none', border: 'none', color: '#f59e0b', fontWeight: 600, cursor: 'pointer' }}
              >
                Iniciar Sesión
              </button>
            </span>
          ) : (
            <span>
              ¿No tienes una cuenta aún?{' '}
              <button
                type="button"
                onClick={() => { setIsRegisterMode(true); setError(null); }}
                style={{ background: 'none', border: 'none', color: '#f59e0b', fontWeight: 600, cursor: 'pointer' }}
              >
                Registrarse aquí
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
