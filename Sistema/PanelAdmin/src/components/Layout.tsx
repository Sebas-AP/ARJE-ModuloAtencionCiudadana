import React, { useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arje_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('arje_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar fijo a la izquierda con animación de contraer (Figma Comentario #2) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        currentUser={currentUser}
        onLogout={onLogout}
        isMockActive={isMockActive}
        onToggleMock={onToggleMock}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Contenedor principal con Header arriba y contenido scrollable */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--color-light-gray)',
          transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Header
          currentTab={currentTab}
          reportes={reportes}
          currentUser={currentUser}
          onLogout={onLogout}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onSelectReporte={onSelectReporte}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={handleToggleCollapse}
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
