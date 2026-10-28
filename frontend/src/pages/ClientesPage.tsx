import React, { useEffect, useState } from 'react';
import { businessApi } from '../api/businessApi';
import { Cliente, TipoIdentificacion } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { Building2, Plus, Search, Edit2, Check, X, ShieldAlert } from 'lucide-react';

const TIPOS_DOC: TipoIdentificacion[] = ['NIT', 'CC', 'CE', 'RUT', 'PASAPORTE'];

export const ClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Campos del Formulario
  const [nombre, setNombre] = useState('');
  const [tipoId, setTipoId] = useState<TipoIdentificacion>('NIT');
  const [numeroId, setNumeroId] = useState('');
  const [email, setEmail] = useState('');
  const [activo, setActivo] = useState(true);

  const fetchClientes = async (searchQuery = '') => {
    setLoading(true);
    try {
      const url = searchQuery ? `/clientes?search=${encodeURIComponent(searchQuery)}` : '/clientes';
      const res = await businessApi.get<Cliente[]>(url);
      setClientes(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al obtener el listado de empresas clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClientes(searchTerm);
  };

  const openCreateModal = () => {
    setEditingCliente(null);
    setNombre('');
    setTipoId('NIT');
    setNumeroId('');
    setEmail('');
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setNombre(cliente.nombre);
    setTipoId(cliente.tipo_identificacion);
    setNumeroId(cliente.numero_identificacion);
    setEmail(cliente.email);
    setActivo(cliente.activo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (editingCliente) {
        await businessApi.put(`/clientes/${editingCliente.id}`, {
          nombre,
          tipo_identificacion: tipoId,
          numero_identificacion: numeroId,
          email,
          activo,
        });
        setSuccess(`Cliente "${nombre}" actualizado correctamente`);
      } else {
        await businessApi.post('/clientes', {
          nombre,
          tipo_identificacion: tipoId,
          numero_identificacion: numeroId,
          email,
          activo,
        });
        setSuccess(`Cliente "${nombre}" registrado exitosamente`);
      }
      closeModal();
      fetchClientes(searchTerm);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Ocurrió un error al procesar el cliente';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Building2 size={28} color="#f59e0b" />
            Empresas Mineras y Clientes
          </h1>
          <p className="page-subtitle">
            Directorio de compañías propietarias de motores de extracción pesada
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus size={18} />
          Registrar Nuevo Cliente
        </button>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Barra de Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Buscar por razón social, NIT / identificación o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
          {searchTerm && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setSearchTerm(''); fetchClientes(''); }}
            >
              Limpiar
            </button>
          )}
        </form>
      </div>

      {/* Tabla de Clientes */}
      <div className="card">
        {loading ? (
          <LoadingSpinner message="Consultando empresas mineras..." />
        ) : clientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            No se encontraron clientes registrados con ese criterio de búsqueda.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Razón Social / Nombre</th>
                  <th>Tipo y N° Identificación</th>
                  <th>Correo Electrónico</th>
                  <th>Estado</th>
                  <th>Fecha de Registro</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{c.nombre}</div>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        backgroundColor: '#0b1120',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #23314d',
                      }}>
                        {c.tipo_identificacion}: {c.numero_identificacion}
                      </span>
                    </td>
                    <td style={{ color: '#cbd5e1' }}>{c.email}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: c.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: c.activo ? '#34d399' : '#f87171',
                        border: `1px solid ${c.activo ? '#10b981' : '#ef4444'}`,
                      }}>
                        {c.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      {new Date(c.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openEditModal(c)}
                        className="btn-secondary btn-sm"
                        title="Editar Cliente"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Cliente */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCliente ? 'Modificar Información de Cliente' : 'Registrar Empresa Cliente'}
              </h3>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
                <div className="form-group">
                  <label className="form-label">Razón Social o Nombre de la Compañía *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ej. Minera del Sinú S.A."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Tipo de Identificación *</label>
                    <select
                      className="form-select"
                      value={tipoId}
                      onChange={(e) => setTipoId(e.target.value as TipoIdentificacion)}
                    >
                      {TIPOS_DOC.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Número de Identificación (Único) *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. 900555888-1"
                      value={numeroId}
                      onChange={(e) => setNumeroId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico de Contacto *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="contacto@minera.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.65rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="clienteActivo"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
                  />
                  <label htmlFor="clienteActivo" style={{ fontSize: '0.875rem', color: '#ffffff', cursor: 'pointer' }}>
                    Cliente Habilitado / Activo para Recepción de Motores
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : editingCliente ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
