import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { businessApi } from '../api/businessApi';
import {
  OrdenReparacion,
  Cliente,
  Motor,
  EstadoOrden,
  ESTADOS_ORDEN_LISTA,
} from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Eye,
  X,
  Calendar,
  Wrench,
  UserCheck,
} from 'lucide-react';

export const OrdenesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [ordenes, setOrdenes] = useState<OrdenReparacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [motores, setMotores] = useState<Motor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>(searchParams.get('estado') || '');
  const [filterCliente, setFilterCliente] = useState<string>(searchParams.get('cliente_id') || '');
  const [filterSearch, setFilterSearch] = useState<string>(searchParams.get('search') || '');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal Crear Orden
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formulario Nueva Orden
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [selectedMotorId, setSelectedMotorId] = useState<number | ''>('');
  const [tecnicoResponsable, setTecnicoResponsable] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [descripcionProblema, setDescripcionProblema] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Motores filtrados para el formulario de creación según el cliente seleccionado
  const [motoresDisponiblesParaCliente, setMotoresDisponiblesParaCliente] = useState<Motor[]>([]);

  const fetchCatalogos = async () => {
    try {
      const [resClientes, resMotores] = await Promise.all([
        businessApi.get<Cliente[]>('/clientes'),
        businessApi.get<Motor[]>('/motores'),
      ]);
      setClientes(resClientes.data);
      setMotores(resMotores.data);
    } catch (err) {
      console.error('Error al cargar catálogos para filtros:', err);
    }
  };

  const fetchOrdenes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEstado) params.append('estado', filterEstado);
      if (filterCliente) params.append('cliente_id', filterCliente);
      if (filterSearch) params.append('search', filterSearch);

      const res = await businessApi.get<OrdenReparacion[]>(`/ordenes?${params.toString()}`);
      setOrdenes(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al obtener las órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, []);

  useEffect(() => {
    fetchOrdenes();
  }, [filterEstado, filterCliente]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrdenes();
  };

  const handleClearFilters = () => {
    setFilterEstado('');
    setFilterCliente('');
    setFilterSearch('');
    setSearchParams({});
    fetchOrdenes();
  };

  const handleClienteChangeInModal = (cId: number) => {
    setSelectedClienteId(cId);
    const filtrados = motores.filter((m) => m.cliente_id === cId);
    setMotoresDisponiblesParaCliente(filtrados);
    setSelectedMotorId(filtrados.length > 0 ? filtrados[0].id : '');
  };

  const openCreateModal = () => {
    if (clientes.length > 0) {
      const primerCli = clientes[0].id;
      setSelectedClienteId(primerCli);
      const filtrados = motores.filter((m) => m.cliente_id === primerCli);
      setMotoresDisponiblesParaCliente(filtrados);
      setSelectedMotorId(filtrados.length > 0 ? filtrados[0].id : '');
    } else {
      setSelectedClienteId('');
      setSelectedMotorId('');
    }
    setTecnicoResponsable('');
    setFechaEstimada('');
    setDescripcionProblema('');
    setObservaciones('');
    setIsModalOpen(true);
  };

  const handleCreateOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteId || !selectedMotorId) {
      setError('Debe seleccionar un cliente y un motor válidos');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await businessApi.post('/ordenes', {
        cliente_id: selectedClienteId,
        motor_id: selectedMotorId,
        tecnico_responsable: tecnicoResponsable,
        descripcion_problema: descripcionProblema,
        fecha_estimada_entrega: fechaEstimada || null,
        observaciones: observaciones || null,
      });

      setSuccess(`Orden ${res.data.numero_orden} generada e ingresada exitosamente`);
      setIsModalOpen(false);
      fetchOrdenes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al generar la orden de reparación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ClipboardList size={28} color="#f59e0b" />
            Órdenes de Reparación de Taller
          </h1>
          <p className="page-subtitle">
            Recepción, diagnóstico técnico y control de fases de mantenimiento
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus size={18} />
          Nueva Orden de Trabajo
        </button>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Barra de Filtros Combinables */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Buscar Texto / N° Orden</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Ej. ORD-2026, técnico..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label className="form-label">Estado de la Orden</label>
            <select
              className="form-select"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              {ESTADOS_ORDEN_LISTA.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Empresa Cliente</label>
            <select
              className="form-select"
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
            >
              <option value="">Todas las Empresas</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              Filtrar
            </button>
            {(filterEstado || filterCliente || filterSearch) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-secondary"
              >
                Limpiar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabla de Órdenes */}
      <div className="card">
        {loading ? (
          <LoadingSpinner message="Consultando órdenes de reparación de motores..." />
        ) : ordenes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            No se encontraron órdenes de reparación que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° de Orden</th>
                  <th>Cliente</th>
                  <th>Motor / Serie</th>
                  <th>Técnico Responsable</th>
                  <th>Fecha Ingreso</th>
                  <th>Fecha Estimada</th>
                  <th>Estado Actual</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        backgroundColor: '#0b1120',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '4px',
                        border: '1px solid #23314d',
                        color: '#f59e0b',
                      }}>
                        {ord.numero_orden}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {ord.cliente?.nombre || `Cliente #${ord.cliente_id}`}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{ord.motor?.fabricante} {ord.motor?.modelo}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          S/N: {ord.motor?.numero_serie}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1' }}>{ord.tecnico_responsable}</td>
                    <td style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      {new Date(ord.fecha_recepcion).toLocaleDateString('es-ES')}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      {ord.fecha_estimada_entrega
                        ? new Date(ord.fecha_estimada_entrega).toLocaleDateString('es-ES')
                        : 'Sin definir'}
                    </td>
                    <td>
                      <span className={`status-badge status-${ord.estado.replace(/\s+/g, '-')}`}>
                        {ord.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/ordenes/${ord.id}`)}
                        className="btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Eye size={14} />
                        Detalle & Historial
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Orden */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Apertura de Orden de Reparación</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrden}>
              <div className="modal-body">
                {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Empresa Minera Propietaria *</label>
                    <select
                      required
                      className="form-select"
                      value={selectedClienteId}
                      onChange={(e) => handleClienteChangeInModal(Number(e.target.value))}
                    >
                      <option value="" disabled>Seleccione empresa cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Motor Pesado a Reparar *</label>
                    <select
                      required
                      className="form-select"
                      value={selectedMotorId}
                      onChange={(e) => setSelectedMotorId(Number(e.target.value))}
                      disabled={motoresDisponiblesParaCliente.length === 0}
                    >
                      {motoresDisponiblesParaCliente.length === 0 ? (
                        <option value="">Este cliente no tiene motores registrados</option>
                      ) : (
                        motoresDisponiblesParaCliente.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fabricante} {m.modelo} (S/N: {m.numero_serie})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Técnico o Ingeniero Responsable *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. Ing. Ricardo Morales"
                      value={tecnicoResponsable}
                      onChange={(e) => setTecnicoResponsable(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha Estimada de Entrega</label>
                    <input
                      type="date"
                      className="form-input"
                      value={fechaEstimada}
                      onChange={(e) => setFechaEstimada(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción del Problema / Falla Reportada *</label>
                  <textarea
                    required
                    rows={3}
                    className="form-textarea"
                    placeholder="Detalle la falla reportada por el cliente (humo blanco, ruido en tren de válvulas, sobrecalentamiento, etc.)..."
                    value={descripcionProblema}
                    onChange={(e) => setDescripcionProblema(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones Iniciales de Recepción</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Motor recibido en plataforma de camión, sin turbo acoplado..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>

                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid #0284c7',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#7dd3fc',
                }}>
                  ℹ️ El número de orden se autogenerará automáticamente con formato <strong>ORD-2026-XXXX</strong> y se creará la primera entrada en la línea de tiempo de estados con estado <strong>Recibido</strong>.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedMotorId}
                  className="btn-primary"
                >
                  {submitting ? 'Creando Orden...' : 'Crear Orden e Iniciar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
