import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessApi } from '../api/businessApi';
import { OrdenReparacion, ResumenEstados, ESTADOS_ORDEN_LISTA } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import {
  ClipboardList,
  Clock,
  Search,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenEstados | null>(null);
  const [ordenesRecientes, setOrdenesRecientes] = useState<OrdenReparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resumenRes, ordenesRes] = await Promise.all([
          businessApi.get<ResumenEstados>('/ordenes/resumen-estados'),
          businessApi.get<OrdenReparacion[]>('/ordenes'),
        ]);

        setResumen(resumenRes.data);
        setOrdenesRecientes(ordenesRes.data.slice(0, 8)); // Primeras 8 recientes
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          'Error al cargar la información del Dashboard de control'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Obteniendo métricas operativas del taller..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <TrendingUp size={28} color="#f59e0b" />
            Tablero de Control de Reparaciones
          </h1>
          <p className="page-subtitle">
            Monitoreo en tiempo real del flujo de motores de minería pesada
          </p>
        </div>
        <button
          onClick={() => navigate('/ordenes')}
          className="btn-primary"
        >
          <ClipboardList size={18} />
          Nueva Orden de Taller
        </button>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}

      {/* Tarjeta Destacada Total */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div className="card" style={{
          borderLeft: '4px solid #f59e0b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Total de Órdenes
            </span>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
              {resumen?.total || 0}
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.5rem' }}>
            Motores registrados en ciclo de servicio
          </span>
        </div>

        {ESTADOS_ORDEN_LISTA.map((estado) => {
          const count = resumen?.estados[estado] || 0;
          return (
            <div
              key={estado}
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onClick={() => navigate(`/ordenes?estado=${encodeURIComponent(estado)}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`status-badge status-${estado.replace(/\s+/g, '-')}`}>
                  {estado}
                </span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                  {count}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Ver órdenes</span>
                <ArrowRight size={14} color="#64748b" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección Órdenes Recientes */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Órdenes de Reparación Recientes
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
              Últimas intervenciones registradas en el taller
            </p>
          </div>
          <button
            onClick={() => navigate('/ordenes')}
            className="btn-secondary btn-sm"
          >
            Ver todas las órdenes
          </button>
        </div>

        {ordenesRecientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
            No hay órdenes de reparación registradas aún.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Cliente</th>
                  <th>Motor / Serie</th>
                  <th>Técnico Responsable</th>
                  <th>Estado Actual</th>
                  <th>Fecha Ingreso</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenesRecientes.map((orden) => (
                  <tr key={orden.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
                        {orden.numero_orden}
                      </span>
                    </td>
                    <td>{orden.cliente?.nombre || `Cliente #${orden.cliente_id}`}</td>
                    <td>
                      <div>
                        <strong>{orden.motor?.fabricante} {orden.motor?.modelo}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          S/N: {orden.motor?.numero_serie}
                        </div>
                      </div>
                    </td>
                    <td>{orden.tecnico_responsable}</td>
                    <td>
                      <span className={`status-badge status-${orden.estado.replace(/\s+/g, '-')}`}>
                        {orden.estado}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      {new Date(orden.fecha_recepcion).toLocaleDateString('es-ES')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/ordenes/${orden.id}`)}
                        className="btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.65rem' }}
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
