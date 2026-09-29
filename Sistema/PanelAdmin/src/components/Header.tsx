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
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ScreenTab } from './Sidebar';
import { ReporteDTO, UsuarioDTO } from '../types';
import { UserBlobatar } from './UserBlobatar';

interface HeaderProps {
  currentTab: ScreenTab;
  reportes: ReporteDTO[];
  currentUser?: UsuarioDTO | null;
  onLogout?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onSelectReporte?: (reporteId: number) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  reportes,
  currentUser,
  onLogout,
  onRefresh,
  isRefreshing = false,
  onSelectReporte,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
          subtitle: 'Monitoreo en tiempo real de incidencias y cuadrillas técnicas',
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
          subtitle: 'Disponibilidad, miembros, vehículos y carga de trabajo',
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
        fontFamily: "var(--font-family-base, 'Inria Sans', sans-serif)",
      }}
    >
      {/* Title & Subtitle + Botón colapsar si sidebar está contraído */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-dark-navy)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-light-gray)';
              e.currentTarget.style.borderColor = 'var(--color-royal-blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--color-dark-navy)',
                margin: 0,
                lineHeight: 1.2,
                fontFamily: "var(--font-family-heading, 'Inria Sans', sans-serif)",
              }}
            >
              {title}
            </h2>
            {currentTab === 'reportes' && (
              <span
                style={{
                  fontSize: '11.5px',
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
      </div>

      {/* Right Actions & User Profile Area (Figma Header) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
            width: '38px',
            height: '38px',
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
            size={17}
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
              width: '38px',
              height: '38px',
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
            <Bell size={18} color="var(--color-dark-navy)" />
            {pendientesCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--gradient-orange)',
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
                top: '48px',
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
                  background: 'var(--gradient-royal)',
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

        {/* Separador sutil */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }} />

        {/* User Profile Avatar (Blobatar con forma Droplet - https://blobatar.dev/?shape=droplet) */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 6px',
              borderRadius: 'var(--radius-full)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-light-gray)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Ver perfil de usuario"
          >
            {/* Avatar oficial de Blobatar con forma Droplet */}
            <UserBlobatar
              name={currentUser?.nombre || 'Administrador General'}
              size={38}
              isOnline={true}
              showBorder={true}
            />

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--color-dark-navy)',
                  lineHeight: 1.2,
                }}
              >
                {currentUser?.nombre || 'Admin ARJE'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  fontWeight: 500,
                }}
              >
                {currentUser?.rol || 'Administrador'}
              </span>
            </div>
          </div>

          {/* Botón de Logout directo en la barra superior (como en el diseño Figma) */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FEF2F2';
                e.currentTarget.style.color = '#EF4444';
                e.currentTarget.style.borderColor = '#FCA5A5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <LogOut size={17} />
            </button>
          )}

          {/* Menú de Perfil Flotante */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '240px',
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)',
                zIndex: 100,
                padding: '16px',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <UserBlobatar
                  name={currentUser?.nombre || 'Administrador'}
                  size={44}
                  isOnline={true}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-dark-navy)' }}>
                    {currentUser?.nombre || 'Administrador'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    {currentUser?.correo || currentUser?.usuario || 'admin@arje.gob.mx'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--color-light-gray)',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  color: 'var(--color-royal-blue)',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}
              >
                Rol: {currentUser?.rol || 'Administrador del Sistema'}
              </div>

              {onLogout && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                >
                  <LogOut size={15} />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
