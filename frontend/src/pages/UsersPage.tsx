import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { User, UserRole } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { Users, Plus, Shield, User as UserIcon, Power, Check, X, Edit2 } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal Crear Usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<UserRole>('operativo');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authApi.get<{ users: User[] }>('/users');
      setUsers(res.data.users);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al obtener el listado de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id && targetUser.activo) {
      setError('No puedes desactivar tu propia cuenta de administrador');
      return;
    }

    setError(null);
    setSuccess(null);

    const nuevoEstado = !targetUser.activo;
    try {
      await authApi.patch(`/users/${targetUser.id}/status`, {
        activo: nuevoEstado,
      });

      setSuccess(`Usuario ${targetUser.nombre} ${nuevoEstado ? 'activado' : 'desactivado'} con éxito`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al modificar el estado del usuario');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.post('/auth/register', {
        nombre,
        email,
        password,
        rol,
      });

      setSuccess(`Usuario ${nombre} creado exitosamente`);
      setIsModalOpen(false);
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('operativo');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar nuevo usuario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users size={28} color="#f59e0b" />
            Administración de Usuarios del Sistema
          </h1>
          <p className="page-subtitle">
            Control de accesos y roles (Admin / Operativo) para auth-service
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          Registrar Nuevo Personal
        </button>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="card">
        {loading ? (
          <LoadingSpinner message="Consultando directorio de usuarios..." />
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nombre y Apellido</th>
                  <th>Correo Electrónico</th>
                  <th>Rol Asignado</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            padding: '0.35rem',
                            borderRadius: '50%',
                            backgroundColor: '#0b1120',
                            border: '1px solid #23314d',
                            color: u.rol === 'admin' ? '#f59e0b' : '#38bdf8',
                          }}>
                            {u.rol === 'admin' ? <Shield size={16} /> : <UserIcon size={16} />}
                          </div>
                          <div>
                            <strong style={{ color: '#ffffff' }}>{u.nombre}</strong>
                            {isSelf && (
                              <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginLeft: '0.4rem', fontWeight: 700 }}>
                                (Tú)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#cbd5e1' }}>{u.email}</td>
                      <td>
                        <span className={`user-role-badge ${u.rol}`}>
                          {u.rol.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: u.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.activo ? '#34d399' : '#f87171',
                          border: `1px solid ${u.activo ? '#10b981' : '#ef4444'}`,
                        }}>
                          {u.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf && u.activo}
                          className="btn-secondary btn-sm"
                          style={{
                            borderColor: u.activo ? '#ef4444' : '#10b981',
                            color: u.activo ? '#f87171' : '#34d399',
                            opacity: isSelf && u.activo ? 0.5 : 1,
                            cursor: isSelf && u.activo ? 'not-allowed' : 'pointer',
                          }}
                          title={u.activo ? 'Desactivar cuenta de usuario' : 'Activar cuenta de usuario'}
                        >
                          <Power size={14} />
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Usuario */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Registrar Nuevo Usuario del Sistema</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ej. Ing. Laura Gómez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="laura.gomez@mineria.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña Temporal *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="Mínimo 6 caracteres..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol en el Sistema *</label>
                  <select
                    className="form-select"
                    value={rol}
                    onChange={(e) => setRol(e.target.value as UserRole)}
                  >
                    <option value="operativo">Operativo (Técnico / Inspector / Operador)</option>
                    <option value="admin">Administrador (Acceso total y gestión de usuarios)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Creando Usuario...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
