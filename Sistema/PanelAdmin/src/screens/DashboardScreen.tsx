import React from 'react';
import { Eye, UserPlus, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, DashboardMetricsDTO, EstatusReporte } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CategoriaBadge } from '../components/CategoriaBadge';

interface DashboardScreenProps {
  reportes: ReporteDTO[];
  cuadrillas: CuadrillaDTO[];
  metrics: DashboardMetricsDTO;
  onSelectReporte: (reporteId: number) => void;
  onOpenAsignarModal: (reporte: ReporteDTO) => void;
  onNavigateToReportes: () => void;
  onNavigateToCuadrillas: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  reportes,
  cuadrillas,
  metrics,
  onSelectReporte,
  onOpenAsignarModal,
  onNavigateToReportes,
}) => {
  // Tomar los reportes principales para la tabla de inicio (Figma muestra los primeros 5)
  const dashboardReportes = reportes.slice(0, 5);

  // Calcular métricas
  const total = reportes.length;
  const resueltos = reportes.filter(
    (r) =>
      r.estatus === EstatusReporte.Completado ||
      r.estatus === EstatusReporte.Cerrado ||
      String(r.estatus).toLowerCase().includes('resuelto')
  ).length;
  const pendientes = reportes.filter(
    (r) =>
      r.estatus === EstatusReporte.Nuevo ||
      String(r.estatus).toLowerCase().includes('pendiente') ||
      !r.cuadrillaAsignadaNombre
  ).length;

  // Helper para formatear tiempo relativo (ej. "hace 30min", "hace 5min")
  const getTiempoTranscurrido = (fecha?: string) => {
    if (!fecha) return 'hace 30min';
    const diffMs = Date.now() - new Date(fecha).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `hace ${Math.max(5, diffMins)}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    return `hace ${Math.floor(diffHours / 24)}d`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '10px 0',
      }}
    >
      {/* Sección 1: Reportes (Exacto a Figma Dashboard Inicio) */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#19244E',
              margin: 0,
            }}
          >
            Reportes
          </h2>

          <button
            onClick={onNavigateToReportes}
            style={{
              background: 'none',
              border: 'none',
              color: '#0057D9',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Ver todos los reportes</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Tabla Estilo Figma: ID, Categoria, Tiempo, Estado, Sector, Acciones */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13.5px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid #E2E8F0',
                  color: '#64748B',
                  fontWeight: 600,
                  fontSize: '13px',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <th style={{ padding: '14px 20px', width: '70px' }}>ID</th>
                <th style={{ padding: '14px 20px' }}>Categoría</th>
                <th style={{ padding: '14px 20px' }}>Tiempo</th>
                <th style={{ padding: '14px 20px' }}>Estado</th>
                <th style={{ padding: '14px 20px' }}>Sector</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', width: '120px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {dashboardReportes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '36px',
                      textAlign: 'center',
                      color: '#64748B',
                    }}
                  >
                    No hay reportes registrados
                  </td>
                </tr>
              ) : (
                dashboardReportes.map((rep, idx) => {
                  const idDisplay = String(idx + 1).padStart(2, '0');
                  const sectorDisplay = rep.id ? String((rep.id % 15) + 1) : '10';

                  return (
                    <tr
                      key={rep.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* ID */}
                      <td
                        style={{
                          padding: '14px 20px',
                          color: '#64748B',
                          fontWeight: 600,
                        }}
                      >
                        {idDisplay}
                      </td>

                      {/* Categoría con IA */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            onClick={() => onSelectReporte(rep.id)}
                            style={{
                              fontWeight: 600,
                              color: '#19244E',
                              cursor: 'pointer',
                            }}
                          >
                            {rep.categoria || rep.descripcion}
                          </span>
                          {rep.confianzaIA && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#F36B2E',
                                fontWeight: 700,
                                backgroundColor: '#FFF0E8',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                              title={`Confianza IA: ${Math.round(rep.confianzaIA * 100)}%`}
                            >
                              IA {Math.round(rep.confianzaIA * 100)}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tiempo */}
                      <td style={{ padding: '14px 20px', color: '#64748B', fontSize: '13px' }}>
                        {getTiempoTranscurrido(rep.fechaCreacion || rep.fechaRecibido)}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '14px 20px' }}>
                        <StatusBadge estatus={rep.estatus} size="sm" />
                      </td>

                      {/* Sector */}
                      <td style={{ padding: '14px 20px', color: '#19244E', fontWeight: 600 }}>
                        {sectorDisplay}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                        >
                          <button
                            onClick={() => onSelectReporte(rep.id)}
                            title="Ver seguimiento detallado"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#0057D9')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            onClick={() => onOpenAsignarModal(rep)}
                            title="Asignar cuadrilla"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#F36B2E')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                          >
                            <UserPlus size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 2: Indicadores (Exacto a Figma Dashboard Inicio) */}
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#19244E',
            margin: '0 0 18px 0',
          }}
        >
          Indicadores
        </h2>

        {/* 3 Tarjetas de Indicadores de Figma: Total Reportes, Reportes resueltos, Reportes pendientes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Card 1: Total Reportes */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#253C96', // Azul ARJE
                lineHeight: 1.2,
                maxWidth: '120px',
              }}
            >
              Total Reportes
            </div>
            <div
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: '#19244E',
                lineHeight: 1,
              }}
            >
              {total}
            </div>
          </div>

          {/* Card 2: Reportes resueltos */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#22C55E', // Verde resuelto
                lineHeight: 1.2,
                maxWidth: '120px',
              }}
            >
              Reportes resueltos
            </div>
            <div
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: '#22C55E',
                lineHeight: 1,
              }}
            >
              {resueltos}
            </div>
          </div>

          {/* Card 3: Reportes pendientes */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#F36B2E', // Naranja pendiente
                lineHeight: 1.2,
                maxWidth: '120px',
              }}
            >
              Reportes pendientes
            </div>
            <div
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: '#F36B2E',
                lineHeight: 1,
              }}
            >
              {pendientes}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
