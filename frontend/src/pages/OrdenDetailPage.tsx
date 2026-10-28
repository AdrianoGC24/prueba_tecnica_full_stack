import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { businessApi } from '../api/businessApi';
import {
  OrdenReparacion,
  EstadoOrden,
  ESTADOS_ORDEN_LISTA,
} from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import {
  ArrowLeft,
  ClipboardList,
  Cpu,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Send,
  User,
  Wrench,
  FileText,
} from 'lucide-react';

export const OrdenDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orden, setOrden] = useState<OrdenReparacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formulario para Actualizar Estado
  const [nuevoEstado, setNuevoEstado] = useState<EstadoOrden>('Recibido');
  const [observacionCambio, setObservacionCambio] = useState('');
  const [diagnosticoTecnico, setDiagnosticoTecnico] = useState('');
  const [trabajoRealizado, setTrabajoRealizado] = useState('');
  const [fechaRealEntrega, setFechaRealEntrega] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrdenDetail = async () => {
    setLoading(true);
    try {
      const res = await businessApi.get<OrdenReparacion>(`/ordenes/${id}`);
      setOrden(res.data);
      setNuevoEstado(res.data.estado);
      setDiagnosticoTecnico(res.data.diagnostico_tecnico || '');
      setTrabajoRealizado(res.data.trabajo_realizado || '');
      setFechaRealEntrega(res.data.fecha_real_entrega || '');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al obtener el detalle de la orden de reparación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrdenDetail();
    }
  }, [id]);

  const handleUpdateEstado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orden) return;

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        estado: nuevoEstado,
        observacion: observacionCambio.trim() || undefined,
        diagnostico_tecnico: diagnosticoTecnico.trim() || undefined,
        trabajo_realizado: trabajoRealizado.trim() || undefined,
      };

      if (fechaRealEntrega) {
        payload.fecha_real_entrega = fechaRealEntrega;
      }

      const res = await businessApi.patch<OrdenReparacion>(`/ordenes/${orden.id}/estado`, payload);
      setOrden(res.data);
      setObservacionCambio('');
      setSuccess(`Estado actualizado con éxito a "${nuevoEstado}" y registrado en el historial`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar el estado de la orden');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando ficha técnica y trazabilidad de la orden..." />;
  }

  if (!orden) {
    return (
      <div>
        <AlertMessage type="error" message="No se encontró la orden especificada" />
        <button onClick={() => navigate('/ordenes')} className="btn-secondary">
          Volver a Órdenes
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Botón Volver y Cabecera */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigate('/ordenes')}
          className="btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}
        >
          <ArrowLeft size={16} />
          Volver al listado de órdenes
        </button>

        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 className="page-title">
                Orden {orden.numero_orden}
              </h1>
              <span className={`status-badge status-${orden.estado.replace(/\s+/g, '-')}`} style={{ fontSize: '0.85rem' }}>
                {orden.estado}
              </span>
            </div>
            <p className="page-subtitle">
              Ingresado al taller el {new Date(orden.fecha_recepcion).toLocaleString('es-ES')} por el técnico <strong>{orden.tecnico_responsable}</strong>
            </p>
          </div>
        </div>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Grid de 3 Columnas: Cliente, Motor y Datos de Entrega */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        {/* Ficha Cliente */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Building2 size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Empresa Propietaria</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Razón Social:</span>{' '}
              <strong style={{ color: '#ffffff' }}>{orden.cliente?.nombre || `ID #${orden.cliente_id}`}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Identificación:</span>{' '}
              <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
                {orden.cliente?.tipo_identificacion}: {orden.cliente?.numero_identificacion}
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Email de Contacto:</span>{' '}
              <span style={{ color: '#cbd5e1' }}>{orden.cliente?.email}</span>
            </div>
          </div>
        </div>

        {/* Ficha Motor */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Cpu size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Ficha del Motor Minero</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Número de Serie:</span>{' '}
              <strong style={{ color: '#f59e0b', fontFamily: 'monospace' }}>
                {orden.motor?.numero_serie}
              </strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Fabricante y Modelo:</span>{' '}
              <span style={{ color: '#ffffff' }}>{orden.motor?.fabricante} {orden.motor?.modelo}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Tipo y Potencia:</span>{' '}
              <span style={{ color: '#cbd5e1' }}>{orden.motor?.tipo_motor} ({orden.motor?.potencia})</span>
            </div>
          </div>
        </div>

        {/* Fechas y Tiempos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Calendar size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Tiempos de Servicio</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Recepción Taller:</span>{' '}
              <span style={{ color: '#ffffff' }}>{new Date(orden.fecha_recepcion).toLocaleDateString('es-ES')}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Estimada de Entrega:</span>{' '}
              <span style={{ color: '#cbd5e1' }}>
                {orden.fecha_estimada_entrega ? new Date(orden.fecha_estimada_entrega).toLocaleDateString('es-ES') : 'No establecida'}
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Fecha Real de Entrega:</span>{' '}
              <strong style={{ color: orden.fecha_real_entrega ? '#34d399' : '#64748b' }}>
                {orden.fecha_real_entrega ? new Date(orden.fecha_real_entrega).toLocaleDateString('es-ES') : 'En proceso en taller'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnóstico y Trabajo Técnico */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
          Información Técnica de Reparación
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Falla Reportada Inicialmente
            </h3>
            <div style={{ backgroundColor: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.85rem', marginTop: '0.4rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
              {orden.descripcion_problema}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Diagnóstico Técnico Realizado
            </h3>
            <div style={{ backgroundColor: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.85rem', marginTop: '0.4rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
              {orden.diagnostico_tecnico || 'Diagnóstico preliminar pendiente de ejecución por el técnico asignado.'}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Trabajo Mecánico / Eléctrico Realizado
            </h3>
            <div style={{ backgroundColor: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.85rem', marginTop: '0.4rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
              {orden.trabajo_realizado || 'Trabajo aún no reportado.'}
            </div>
          </div>
        </div>
      </div>

      {/* Panel para Actualizar Estado de la Orden */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid #3b82f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <Wrench size={22} color="#38bdf8" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Transición de Estado Técnico (Flujo Oficial de 7 Estados)
          </h2>
        </div>

        <form onSubmit={handleUpdateEstado}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nuevo Estado Operativo *</label>
              <select
                className="form-select"
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value as EstadoOrden)}
              >
                {ESTADOS_ORDEN_LISTA.map((est) => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha Real de Entrega (Opcional o al finalizar)</label>
              <input
                type="date"
                className="form-input"
                value={fechaRealEntrega}
                onChange={(e) => setFechaRealEntrega(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Actualizar Diagnóstico Técnico</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="Observaciones de metrología, escaneo electrónico o pruebas de banco..."
                value={diagnosticoTecnico}
                onChange={(e) => setDiagnosticoTecnico(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Actualizar Trabajo Realizado</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="Piezas reemplazadas, rectificado de cigüeñal, cambio de camisas..."
                value={trabajoRealizado}
                onChange={(e) => setTrabajoRealizado(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Motivo u Observación del Cambio de Estado (Trazabilidad) *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Ej. Aprobada cotización por el cliente, motor entra a banco de desarme..."
              value={observacionCambio}
              onChange={(e) => setObservacionCambio(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="btn-primary"
            style={{ marginTop: '0.5rem' }}
          >
            <Send size={16} />
            {updating ? 'Registrando Transición...' : 'Actualizar Estado y Registrar en Historial'}
          </button>
        </form>
      </div>

      {/* Línea de Tiempo del Historial de Estados */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <History size={22} color="#f59e0b" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Línea de Tiempo y Trazabilidad de Estados
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
          Registro cronológico auditado de cada cambio de fase, responsable y motivo técnico.
        </p>

        {(!orden.historial || orden.historial.length === 0) ? (
          <div style={{ color: '#94a3b8', padding: '1rem 0' }}>
            No hay registros de historial disponibles.
          </div>
        ) : (
          <div className="timeline">
            {orden.historial.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.estado_anterior ? (
                        <>
                          <span className={`status-badge status-${item.estado_anterior.replace(/\s+/g, '-')}`}>
                            {item.estado_anterior}
                          </span>
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>→</span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>[Inicio]</span>
                      )}
                      <span className={`status-badge status-${item.estado_nuevo.replace(/\s+/g, '-')}`}>
                        {item.estado_nuevo}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} />
                      {new Date(item.fecha_cambio).toLocaleString('es-ES')}
                    </span>
                  </div>

                  {item.observacion && (
                    <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '0.5rem' }}>
                      "{item.observacion}"
                    </p>
                  )}

                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={12} />
                    Registrado por: <strong style={{ color: '#94a3b8' }}>{item.usuario_email || 'Sistema'}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
