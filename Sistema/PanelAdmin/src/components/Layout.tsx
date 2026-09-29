import React from 'react';
import { Sidebar, ScreenTab } from './Sidebar';
import { Header } from './Header';
import { UsuarioDTO, ReporteDTO } from '../types';

interface LayoutProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  currentUser: UsuarioDTO | null;
  onLogout: () => void;
  isMockActive: boolean;
  onToggleMock: () => void;
  reportes: ReporteDTO[];
  onRefresh: () => void;
  isRefreshing?: boolean;
  onSelectReporte?: (reporteId: number) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  isMockActive,
  onToggleMock,
  reportes,
  onRefresh,
  isRefreshing = false,
  onSelectReporte,
  children,
}) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        currentUser={currentUser}
        onLogout={onLogout}
        isMockActive={isMockActive}
        onToggleMock={onToggleMock}
      />

      {/* Contenedor principal con Header arriba y contenido scrollable */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--color-light-gray)',
        }}
      >
        <Header
          currentTab={currentTab}
          reportes={reportes}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onSelectReporte={onSelectReporte}
        />

        <main
          style={{
            flex: 1,
            padding: '24px 32px 48px',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
