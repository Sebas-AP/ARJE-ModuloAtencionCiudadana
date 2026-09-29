import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { ScreenTab } from './Sidebar';
import { ReporteDTO } from '../types';

interface HeaderProps {
  currentTab: ScreenTab;
  reportes: ReporteDTO[];
  onRefresh: () => void;
  isRefreshing?: boolean;
  onSelectReporte?: (reporteId: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  reportes,
  onRefresh,
  isRefreshing = false,
  onSelectReporte,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      setCurrentTime(now.toLocaleDateString('es-MX', options));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const getTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Panel de Control Operativo',
          subtitle: 'Monitoreo en tiempo real de reportes de agua y cuadrillas',
        };
      case 'reportes':
        return {
          title: 'Gestión Integral de Reportes',
          subtitle: 'Catálogo de incidencias, asignación y auditoría de clasificación IA',
        };
      case 'mapa':
        return {
          title: 'Monitoreo Geográfico en Vivo',
          subtitle: 'Ubicación geoespacial de incidencias y unidades activas',
        };
      case 'cuadrillas':
        return {
          title: 'Control de Cuadrillas Técnicas',
          subtitle: 'Disponibilidad, personal, vehículos y carga de trabajo',
        };
      case 'indicadores':
        return {
          title: 'Indicadores y Métricas de Desempeño',
          subtitle: 'Estadísticas de respuesta, volumen mensual y eficiencia operativa',
        };
      case 'seguimiento':
        return {
          title: 'Seguimiento Detallado de Reporte',
          subtitle: 'Bitácora técnica, evidencias y trazabilidad de atención',
        };
      default:
        return {
          title: 'Panel Administrador',
          subtitle: 'Sistema de Gestión de Agua Potable ARJE',
        };
    }
  };

  const { title, subtitle } = getTitle();

  // Pendientes sin asignar
  const pendientes = reportes.filter(
    (r) => r.estatus === 'Pendiente' || !r.cuadrillaAsignada
  );
  const pendientesCount = pendientes.length;

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Title & Subtitle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--color-dark-navy)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
          {currentTab === 'reportes' && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                backgroundColor: 'var(--color-cyan-light)',
                color: 'var(--color-royal-blue)',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(0, 184, 217, 0.3)',
              }}
            >
              {reportes.length} registros
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: '12.5px',
            color: 'var(--color-text-muted)',
            margin: '2px 0 0 0',
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Right Actions & Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Real-time Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: 'var(--color-light-gray)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-dark-navy)',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
        >
          <Clock size={14} color="var(--color-electric-blue)" />
          <span style={{ textTransform: 'capitalize' }}>
            {currentTime || 'Cargando hora...'}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Actualizar datos del sistema"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-white)',
            color: 'var(--color-dark-navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isRefreshing ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-light-gray)';
            e.currentTarget.style.borderColor = 'var(--color-electric-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-white)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <RefreshCw
            size={18}
            className={isRefreshing ? 'animate-spin' : ''}
            style={{
              transition: 'transform 0.5s',
              transform: isRefreshing ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Alertas y Notificaciones de Reportes"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: showNotifications
                ? 'var(--color-cyan-light)'
                : 'var(--color-white)',
              color: 'var(--color-dark-navy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Bell size={19} color="var(--color-dark-navy)" />
            {pendientesCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--color-orange)',
                  color: 'var(--color-white)',
                  fontSize: '11px',
                  fontWeight: 800,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(243, 107, 46, 0.4)',
                  border: '2px solid var(--color-white)',
                }}
              >
                {pendientesCount > 9 ? '9+' : pendientesCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '360px',
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: 'var(--color-royal-blue)',
                  color: 'var(--color-white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    Centro de Alertas ({pendientesCount})
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-white)',
                    cursor: 'pointer',
                    opacity: 0.8,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {pendientes.length === 0 ? (
                  <div
                    style={{
                      padding: '28px 20px',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <CheckCircle2
                      size={32}
                      color="var(--color-success)"
                      style={{ margin: '0 auto 8px' }}
                    />
                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                      Al día: No hay reportes pendientes
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      Todas las incidencias tienen cuadrilla asignada.
                    </div>
                  </div>
                ) : (
                  pendientes.slice(0, 5).map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setShowNotifications(false);
                        if (onSelectReporte) onSelectReporte(rep.id);
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-light-gray)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-amber-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <AlertTriangle size={16} color="var(--color-amber)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 700,
                              color: 'var(--color-dark-navy)',
                            }}
                          >
                            {rep.folio}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            Sin asignar
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-royal-blue)',
                            fontWeight: 600,
                            marginTop: '2px',
                          }}
                        >
                          {rep.categoria || 'Sin clasificar'}
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--color-text-body)',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {rep.direccion || rep.descripcion}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {pendientes.length > 5 && (
                <div
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-light-gray)',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-electric-blue)',
                      fontWeight: 600,
                    }}
                  >
                    + {pendientes.length - 5} reportes más pendientes
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
