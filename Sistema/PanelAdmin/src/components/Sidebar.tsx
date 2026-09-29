import React from 'react';
import {
  Home,
  ClipboardList,
  Users,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { UsuarioDTO } from '../types';
import arjeLogoWhite from '../assets/arje-logo-white.png';
import { UserBlobatar } from './UserBlobatar';

export type ScreenTab = 'dashboard' | 'reportes' | 'cuadrillas' | 'indicadores' | 'seguimiento' | 'mapa';

interface SidebarProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  currentUser: UsuarioDTO | null;
  onLogout: () => void;
  isMockActive: boolean;
  onToggleMock: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  isMockActive,
  onToggleMock,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  // Los 4 módulos oficiales exactos del diseño de Figma con iconos actualizados
  const menuItems = [
    {
      id: 'dashboard' as ScreenTab,
      label: 'Inicio',
      icon: Home,
    },
    {
      id: 'reportes' as ScreenTab,
      label: 'Reportes',
      icon: ClipboardList,
    },
    {
      id: 'cuadrillas' as ScreenTab,
      label: 'Cuadrillas',
      icon: Users,
    },
    {
      id: 'indicadores' as ScreenTab,
      label: 'Indicadores',
      icon: BarChart3,
    },
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? '76px' : '230px',
        background: 'var(--gradient-royal, linear-gradient(180deg, #253C96 0%, #16245C 100%))',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxSizing: 'border-box',
        userSelect: 'none',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header Superior con Logo y Botón de Colapsar (Figma Comentario #2) */}
      <div
        style={{
          padding: isCollapsed ? '24px 12px 16px' : '26px 18px 18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          minHeight: '72px',
          boxSizing: 'border-box',
        }}
      >
        {!isCollapsed ? (
          <img
            src={arjeLogoWhite}
            alt="ARJE"
            style={{
              height: '36px',
              width: 'auto',
              maxWidth: '140px',
              objectFit: 'contain',
              transition: 'opacity 0.2s ease',
            }}
          />
        ) : (
          <div
            title="ARJE Sistema"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              color: '#FFFFFF',
              letterSpacing: '1px',
            }}
          >
            A
          </div>
        )}

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Contraer barra de navegación"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Menú de Navegación Oficial Figma */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed ? '16px 10px' : '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id ||
            (currentTab === 'seguimiento' && item.id === 'reportes') ||
            (currentTab === 'mapa' && item.id === 'dashboard');

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '14px',
                padding: isCollapsed ? '12px' : '10px 16px',
                borderRadius: '8px',
                // En Figma: Gradiente Naranja #F36B2E cuando está activo, transparente si inactivo
                background: isActive
                  ? 'var(--gradient-orange, linear-gradient(180deg, #F97A3C 0%, #E85B1C 100%))'
                  : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(243, 107, 46, 0.35)' : 'none',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14.5px',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={isCollapsed ? 22 : 19} color="#FFFFFF" style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Botón de Expandir cuando está Colapsado */}
      {isCollapsed && onToggleCollapse && (
        <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onToggleCollapse}
            title="Expandir barra de navegación"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      {/* Selector de Modo de Conectividad (Mock / API Real) */}
      {!isCollapsed && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <button
            onClick={onToggleMock}
            title="Alternar entre modo Mock y API real"
            style={{
              width: '100%',
              padding: '7px 10px',
              backgroundColor: isMockActive
                ? 'rgba(245, 154, 30, 0.2)'
                : 'rgba(34, 197, 94, 0.2)',
              border: isMockActive
                ? '1px solid #F59A1E'
                : '1px solid #22C55E',
              borderRadius: '4px',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span>{isMockActive ? 'Modo: Mock Offline' : 'Modo: API .NET Real'}</span>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isMockActive ? '#F59A1E' : '#22C55E',
              }}
            />
          </button>
        </div>
      )}

      {/* Footer del Usuario con Avatar Blobatar (droplet shape) y Logout */}
      <div
        style={{
          padding: isCollapsed ? '14px 10px' : '14px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: 0,
          }}
        >
          {/* Avatar con la forma droplet de blobatar.dev */}
          <UserBlobatar
            name={currentUser?.nombre || 'Administrador'}
            size={isCollapsed ? 34 : 32}
            showBorder={false}
            isOnline={true}
          />

          {!isCollapsed && (
            <div
              style={{
                fontSize: '12px',
                color: '#FFFFFF',
                fontWeight: 600,
                maxWidth: '105px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={currentUser?.nombre || 'Administrador'}
            >
              {currentUser?.nombre || 'Admin'}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};
