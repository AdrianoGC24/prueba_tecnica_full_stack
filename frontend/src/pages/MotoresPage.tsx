import React, { useEffect, useState } from 'react';
import { businessApi } from '../api/businessApi';
import { Motor, Cliente } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { Cpu, Plus, Edit2, Filter, X } from 'lucide-react';

export const MotoresPage: React.FC = () => {
  const [motores, setMotores] = useState<Motor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClienteFilter, setSelectedClienteFilter] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMotor, setEditingMotor] = useState<Motor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulario
  const [numeroSerie, setNumeroSerie] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipoMotor, setTipoMotor] = useState('');
  const [potencia, setPotencia] = useState('');
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [activo, setActivo] = useState(true);

  const fetchClientes = async () => {
    try {
      const res = await businessApi.get<Cliente[]>('/clientes');
      setClientes(res.data);
    } catch (err) {
      console.error('Error al cargar lista de clientes para selector:', err);
    }
  };

  const fetchMotores = async (cId = '') => {
    setLoading(true);
    try {
      const url = cId ? `/motores?cliente_id=${cId}` : '/motores';
      const res = await businessApi.get<Motor[]>(url);
      setMotores(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al obtener el parque de motores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    fetchMotores();
  }, []);

  const handleFilterChange = (cId: string) => {
    setSelectedClienteFilter(cId);
    fetchMotores(cId);
  };

  const openCreateModal = () => {
    setEditingMotor(null);
    setNumeroSerie('');
    setFabricante('Caterpillar');
    setModelo('');
    setTipoMotor('Diesel Heavy Duty');
    setPotencia('');
    setClienteId(clientes.length > 0 ? clientes[0].id : '');
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (motor: Motor) => {
    setEditingMotor(motor);
    setNumeroSerie(motor.numero_serie);
    setFabricante(motor.fabricante);
    setModelo(motor.modelo);
    setTipoMotor(motor.tipo_motor);
    setPotencia(motor.potencia);
    setClienteId(motor.cliente_id);
    setActivo(motor.activo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMotor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setError('Debe seleccionar una empresa cliente propietaria');
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (editingMotor) {
        await businessApi.put(`/motores/${editingMotor.id}`, {
          numero_serie: numeroSerie,
          fabricante,
          modelo,
          tipo_motor: tipoMotor,
          potencia,
          cliente_id: clienteId,
          activo,
        });
        setSuccess(`Motor serie "${numeroSerie}" actualizado correctamente`);
      } else {
        await businessApi.post('/motores', {
          numero_serie: numeroSerie,
          fabricante,
          modelo,
          tipo_motor: tipoMotor,
          potencia,
          cliente_id: clienteId,
          activo,
        });
        setSuccess(`Motor serie "${numeroSerie}" registrado con éxito`);
      }
      closeModal();
      fetchMotores(selectedClienteFilter);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Ocurrió un error al procesar el motor';
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
            <Cpu size={28} color="#f59e0b" />
            Parque de Motores de Minería
          </h1>
          <p className="page-subtitle">
            Inventario técnico de motores pesados (CAT, Cummins, Komatsu, MTU)
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus size={18} />
          Registrar Motor
        </button>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Filtro por Cliente */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Filter size={18} color="#f59e0b" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8' }}>
            Filtrar por Empresa Minera:
          </span>
          <select
            className="form-select"
            style={{ maxWidth: '320px' }}
            value={selectedClienteFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">Todas las empresas cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.numero_identificacion})
              </option>
            ))}
          </select>
          {selectedClienteFilter && (
            <button
              onClick={() => handleFilterChange('')}
              className="btn-secondary btn-sm"
            >
              Quitar Filtro
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Motores */}
      <div className="card">
        {loading ? (
          <LoadingSpinner message="Consultando parque de motores pesados..." />
        ) : motores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            No se encontraron motores registrados para el filtro seleccionado.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° de Serie (Único)</th>
                  <th>Fabricante y Modelo</th>
                  <th>Tipo de Motor</th>
                  <th>Potencia</th>
                  <th>Cliente Propietario</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {motores.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        backgroundColor: '#0b1120',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #23314d',
                        color: '#f59e0b',
                      }}>
                        {m.numero_serie}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>
                        {m.fabricante} {m.modelo}
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1' }}>{m.tipo_motor}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                        {m.potencia}
                      </span>
                    </td>
                    <td>
                      {m.cliente?.nombre || `Cliente #${m.cliente_id}`}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: m.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: m.activo ? '#34d399' : '#f87171',
                        border: `1px solid ${m.activo ? '#10b981' : '#ef4444'}`,
                      }}>
                        {m.activo ? 'OPERATIVO' : 'DE BAJA'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openEditModal(m)}
                        className="btn-secondary btn-sm"
                        title="Editar Motor"
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

      {/* Modal Registrar / Editar Motor */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingMotor ? 'Modificar Ficha Técnica de Motor' : 'Registrar Nuevo Motor Minero'}
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
                  <label className="form-label">Número de Serie (Identificador Único) *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ej. CAT-C175-88421"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Fabricante *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. Caterpillar, Cummins, Komatsu"
                      value={fabricante}
                      onChange={(e) => setFabricante(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Modelo *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. C175-16, QSK60"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Tipo de Motor *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. Diesel V16 Turbo"
                      value={tipoMotor}
                      onChange={(e) => setTipoMotor(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Potencia Nominal *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. 3500 HP, 2600 kW"
                      value={potencia}
                      onChange={(e) => setPotencia(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Empresa Minera Propietaria *</label>
                  <select
                    required
                    className="form-select"
                    value={clienteId}
                    onChange={(e) => setClienteId(Number(e.target.value))}
                  >
                    <option value="" disabled>Seleccione una empresa cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} (NIT/ID: {c.numero_identificacion})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.65rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="motorActivo"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
                  />
                  <label htmlFor="motorActivo" style={{ fontSize: '0.875rem', color: '#ffffff', cursor: 'pointer' }}>
                    Motor Habilitado en Sistema
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : editingMotor ? 'Guardar Cambios' : 'Registrar Motor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
