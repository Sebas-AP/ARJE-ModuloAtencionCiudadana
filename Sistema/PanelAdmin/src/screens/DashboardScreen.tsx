import React from 'react';
import { ClipboardList, Users, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, DashboardMetricsDTO, EstatusReporte } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardScreenProps {
  reportes: ReporteDTO[];
  cuadrillas: CuadrillaDTO[];
  metrics: DashboardMetricsDTO;
  onSelectReporte: (reporteId: number) => void;
  onOpenAsignarModal: (reporte: ReporteDTO) => void;
  onOpenSupervisionModal?: (reporte: ReporteDTO) => void;
  onNavigateToReportes: () => void;
  onNavigateToCuadrillas: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  reportes,
  cuadrillas,
  metrics,
  onSelectReporte,
  onOpenAsignarModal,
  onOpenSupervisionModal,
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

  // Manejador de clic según comentarios de Figma (#3 y #4):
  // - Reporte completado: despliega modal de programación de visita de supervisión
  // - Reporte pendiente: manda a la pantalla con información detallada y asignación
  const handleReportClick = (rep: ReporteDTO) => {
    const isCompleted =
      rep.estatus === EstatusReporte.Completado ||
      rep.estatus === EstatusReporte.Cerrado ||
      String(rep.estatus).toLowerCase().includes('resuelto');

    if (isCompleted && onOpenSupervisionModal) {
      onOpenSupervisionModal(rep);
    } else {
      onSelectReporte(rep.id);
    }
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
        fontFamily: "var(--font-family-base, 'Inria Sans', sans-serif)",
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
              fontFamily: "var(--font-family-heading, 'Inria Sans', sans-serif)",
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
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'gap 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0045B0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#0057D9')}
          >
            <span>Ver todos los reportes</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Tabla Estilo Figma: ID, Categoria, Tiempo, Estado, Sector, Acciones con gradiente de cabecera */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(25, 36, 78, 0.04)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid #E2E8F0',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  background: 'var(--gradient-table-header, linear-gradient(180deg, #F8FAFD 0%, #EDF3FC 100%))',
                }}
              >
                <th style={{ padding: '14px 20px', width: '70px' }}>ID</th>
                <th style={{ padding: '14px 20px' }}>Categoría</th>
                <th style={{ padding: '14px 20px' }}>Tiempo</th>
                <th style={{ padding: '14px 20px' }}>Estado</th>
                <th style={{ padding: '14px 20px' }}>Sector</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', width: '130px' }}>
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
                      onClick={() => handleReportClick(rep)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Haz clic para ver detalles del reporte"
                    >
                      {/* ID */}
                      <td
                        style={{
                          padding: '14px 20px',
                          color: '#64748B',
                          fontWeight: 700,
                        }}
                      >
                        {idDisplay}
                      </td>

                      {/* Categoría con IA */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#19244E',
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
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title={`Confianza IA: ${Math.round(rep.confianzaIA * 100)}%`}
                            >
                              <Sparkles size={11} color="#F36B2E" />
                              IA {Math.round(rep.confianzaIA * 100)}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tiempo */}
                      <td style={{ padding: '14px 20px', color: '#64748B', fontSize: '13.5px' }}>
                        {getTiempoTranscurrido(rep.fechaCreacion || rep.fechaRecibido)}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '14px 20px' }}>
                        <StatusBadge estatus={rep.estatus} size="sm" />
                      </td>

                      {/* Sector */}
                      <td style={{ padding: '14px 20px', color: '#19244E', fontWeight: 700 }}>
                        {sectorDisplay}
                      </td>

                      {/* Acciones Oficiales de Figma (ClipboardList, Users) */}
                      <td
                        style={{ padding: '14px 20px', textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                          }}
                        >
                          {/* Icono de ClipboardList (Figma: Abrir detalle / seguimiento) */}
                          <button
                            onClick={() => handleReportClick(rep)}
                            title="Ver detalles del reporte"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#0057D9';
                              e.currentTarget.style.backgroundColor = '#EFF6FF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#64748B';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <ClipboardList size={18} />
                          </button>

                          {/* Icono de Users (Figma: Asignar cuadrilla) */}
                          <button
                            onClick={() => onOpenAsignarModal(rep)}
                            title="Asignar cuadrilla de trabajo"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#F36B2E';
                              e.currentTarget.style.backgroundColor = '#FFF0E8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#64748B';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Users size={18} />
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

      {/* Sección 2: Indicadores (Exacto a Figma Dashboard Inicio con Gradientes) */}
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#19244E',
            margin: '0 0 18px 0',
            fontFamily: "var(--font-family-heading, 'Inria Sans', sans-serif)",
          }}
        >
          Indicadores
        </h2>

        {/* 3 Tarjetas de Indicadores de Figma con gradientes de fondo y tipografía Inria Sans */}
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
              background: 'var(--gradient-card-total, linear-gradient(180deg, #FFFFFF 0%, #F4F7FD 100%))',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(25, 36, 78, 0.05)',
              transition: 'transform 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(25, 36, 78, 0.09)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(25, 36, 78, 0.05)';
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#253C96', // Royal Blue ARJE
                lineHeight: 1.2,
                maxWidth: '120px',
              }}
            >
              Total Reportes
            </div>
            <div
              style={{
                fontSize: '48px',
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
              background: 'var(--gradient-card-success, linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%))',
              borderRadius: '12px',
              border: '1px solid #86EFAC',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
              transition: 'transform 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(34, 197, 94, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.08)';
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#16A34A', // Verde resuelto
                lineHeight: 1.2,
                maxWidth: '120px',
              }}
            >
              Reportes resueltos
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 800,
                color: '#16A34A',
                lineHeight: 1,
              }}
            >
              {resueltos}
            </div>
          </div>

          {/* Card 3: Reportes pendientes */}
          <div
            style={{
              background: 'var(--gradient-card-warning, linear-gradient(180deg, #FFFFFF 0%, #FFFBEB 100%))',
              borderRadius: '12px',
              border: '1px solid #FDE68A',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(243, 107, 46, 0.08)',
              transition: 'transform 0.18s, box-shadow 0.18s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(243, 107, 46, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(243, 107, 46, 0.08)';
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#D97706', // Naranja/ámbar pendiente
                lineHeight: 1.2,
                maxWidth: '120px',
              }}
            >
              Reportes pendientes
            </div>
            <div
              style={{
                fontSize: '48px',
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
