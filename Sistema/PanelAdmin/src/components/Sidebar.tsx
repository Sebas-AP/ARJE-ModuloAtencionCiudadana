import React from 'react';
import { Home, FileText, Users, Gauge, LogOut, Radio } from 'lucide-react';
import { UsuarioDTO } from '../types';
import arjeLogoWhite from '../assets/arje-logo-white.png';

export type ScreenTab = 'dashboard' | 'reportes' | 'cuadrillas' | 'indicadores' | 'seguimiento' | 'mapa';

interface SidebarProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  currentUser: UsuarioDTO | null;
  onLogout: () => void;
  isMockActive: boolean;
  onToggleMock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  isMockActive,
  onToggleMock,
}) => {
  // Los 4 módulos oficiales exactos del diseño de Figma
  const menuItems = [
    {
      id: 'dashboard' as ScreenTab,
      label: 'Inicio',
      icon: Home,
    },
    {
      id: 'reportes' as ScreenTab,
      label: 'Reportes',
      icon: FileText,
    },
    {
      id: 'cuadrillas' as ScreenTab,
      label: 'Cuadrillas',
      icon: Users,
    },
    {
      id: 'indicadores' as ScreenTab,
      label: 'Indicadores',
      icon: Gauge,
    },
  ];

  return (
    <aside
      style={{
        width: '230px',
        backgroundColor: '#253C96', // Royal Blue oficial de Figma
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* Logo ARJE Superior (Fiel a Figma) */}
      <div
        style={{
          padding: '30px 24px 20px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img
          src={arjeLogoWhite}
          alt="ARJE"
          style={{
            height: '38px',
            width: 'auto',
            maxWidth: '160px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Menú de Navegación Oficial Figma */}
      <nav
        style={{
          flex: 1,
          padding: '16px 14px',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 16px',
                borderRadius: '6px',
                // En Figma: Fondo Orange #F36B2E cuando está activo, transparente si inactivo
                backgroundColor: isActive ? '#F36B2E' : 'transparent',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14.5px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={19} color="#FFFFFF" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Selector de Modo de Conectividad (Mock / API Real) */}
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

      {/* Footer del Usuario con Logout */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F36B2E, #F59A1E)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            {currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : 'A'}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#FFFFFF',
              fontWeight: 600,
              maxWidth: '120px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentUser?.nombre || 'Admin'}
          </div>
        </div>

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
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
