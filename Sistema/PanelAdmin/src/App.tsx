import React, { useState, useEffect, useCallback } from 'react';
import { ScreenTab } from './components/Sidebar';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ReportesScreen } from './screens/ReportesScreen';
import { SeguimientoScreen } from './screens/SeguimientoScreen';
import { CuadrillasScreen } from './screens/CuadrillasScreen';
import { IndicadoresScreen } from './screens/IndicadoresScreen';
import { MapaScreen } from './screens/MapaScreen';

// Modales del sistema
import { ModalAsignarCuadrilla } from './components/ModalAsignarCuadrilla';
import { ModalCorregirCategoria } from './components/ModalCorregirCategoria';
import { ModalProgramarSupervision } from './components/ModalProgramarSupervision';
import { ModalNuevaCuadrilla } from './components/ModalNuevaCuadrilla';

// Servicios y Tipos
import {
  ReporteDTO,
  CuadrillaDTO,
  DashboardMetricsDTO,
  UsuarioDTO,
  EstatusReporte,
  EstatusCuadrilla,
  TipoProblema,
  CuadrillaCreacionDTO,
} from './types';
import { reportesService } from './services/reportesService';
import { cuadrillasService } from './services/cuadrillasService';
import { indicadoresService } from './services/indicadoresService';
import { authService } from './services/authService';
import { USE_MOCK_DATA, toggleMockData } from './services/api';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastState {
  id: number;
  tipo: 'success' | 'error' | 'info';
  mensaje: string;
}

export function App() {
  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<UsuarioDTO | null>(() =>
    authService.getCurrentUser()
  );

  // Navegación
  const [currentTab, setCurrentTab] = useState<ScreenTab>('dashboard');
  const [selectedReporteId, setSelectedReporteId] = useState<number | null>(null);

  // Datos Operativos
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [cuadrillas, setCuadrillas] = useState<CuadrillaDTO[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetricsDTO>({
    reportesTotales: 0,
    reportesEnProceso: 0,
    reportesPendientes: 0,
    reportesResueltos: 0,
    deltaHoy: 0,
    deltaEnProceso: 0,
    deltaPendientes: 0,
    deltaResueltos: 0,
    totalReportes: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isMockActive, setIsMockActive] = useState<boolean>(USE_MOCK_DATA);

  // Estados de Modales
  const [asignarReporte, setAsignarReporte] = useState<ReporteDTO | null>(null);
  const [corregirReporte, setCorregirReporte] = useState<ReporteDTO | null>(null);
  const [supervisionReporte, setSupervisionReporte] = useState<ReporteDTO | null>(null);
  const [nuevaCuadrillaOpen, setNuevaCuadrillaOpen] = useState<boolean>(false);

  // Notificaciones Toast
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback(
    (mensaje: string, tipo: 'success' | 'error' | 'info' = 'success') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  // Cargar datos del sistema
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [repRes, cuadRes, metRes] = await Promise.all([
        reportesService.getAll(),
        cuadrillasService.getAll(),
        indicadoresService.getMetrics(),
      ]);

      setReportes(repRes.data);
      setCuadrillas(cuadRes);

      // Calcular métricas si faltan o complementar con el estado real
      const total = repRes.data.length;
      const resueltos = repRes.data.filter(
        (r) => r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado || String(r.estatus).toLowerCase().includes('resuelto')
      ).length;
      const pendientes = repRes.data.filter(
        (r) => r.estatus === EstatusReporte.Nuevo || String(r.estatus).toLowerCase().includes('pendiente') || !r.cuadrillaAsignadaNombre
      ).length;
      const enProceso = repRes.data.filter(
        (r) => r.estatus === EstatusReporte.EnProceso || r.estatus === EstatusReporte.Asignado || String(r.estatus).toLowerCase().includes('proceso')
      ).length;

      setMetrics({
        ...metRes,
        reportesTotales: total || metRes.reportesTotales,
        totalReportes: total || metRes.reportesTotales,
        reportesResueltos: resueltos || metRes.reportesResueltos,
        reportesPendientes: pendientes || metRes.reportesPendientes,
        reportesEnProceso: enProceso || metRes.reportesEnProceso,
      });
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      showToast('Error de comunicación con el backend: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Manejo de Autenticación
  const handleLoginSuccess = (user: UsuarioDTO) => {
    setCurrentUser(user);
    showToast(`Bienvenido al sistema ARJE, ${user.nombre}`, 'success');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentTab('dashboard');
    showToast('Sesión finalizada correctamente', 'info');
  };

  const handleToggleMockMode = () => {
    const nextMode = toggleMockData();
    setIsMockActive(nextMode);
    showToast(
      nextMode
        ? 'Cambiado a Modo Offline (Mock Data)'
        : 'Cambiado a Modo Online (API Real ASP.NET Core)',
      'info'
    );
    loadData();
  };

  // Selección de reporte para seguimiento
  const handleSelectReporte = (id: number) => {
    setSelectedReporteId(id);
    setCurrentTab('seguimiento');
  };

  // Acciones en Reportes
  const handleAsignarConfirm = async (
    idCuadrilla: number,
    tiempoEstimadoMinutos?: number,
    cuadrillaNombre?: string
  ) => {
    if (!asignarReporte) return;
    try {
      await reportesService.asignarCuadrilla(asignarReporte.id, {
        idCuadrilla,
        tiempoEstimado: tiempoEstimadoMinutos,
      });

      // Actualizar estado local
      setReportes((prev) =>
        prev.map((r) =>
          r.id === asignarReporte.id
            ? {
                ...r,
                estatus: EstatusReporte.Asignado,
                idCuadrillaAsignada: idCuadrilla,
                cuadrillaAsignada: cuadrillaNombre || 'Cuadrilla Asignada',
                cuadrillaAsignadaNombre: cuadrillaNombre || 'Cuadrilla Asignada',
                tiempoEstimado: tiempoEstimadoMinutos,
              }
            : r
        )
      );

      setAsignarReporte(null);
      showToast(
        `Reporte ${asignarReporte.folio || asignarReporte.id} asignado con éxito a ${
          cuadrillaNombre || 'la cuadrilla'
        }`,
        'success'
      );
    } catch (err: any) {
      showToast('Error al asignar cuadrilla: ' + err.message, 'error');
    }
  };

  const handleCorregirConfirm = async (
    nuevaCategoria: string,
    nuevoTipo: TipoProblema,
    razonamiento: string
  ) => {
    if (!corregirReporte) return;
    try {
      await reportesService.actualizarCategoria(corregirReporte.id, {
        categoria: nuevaCategoria,
        tipoProblema: nuevoTipo,
        razonamiento,
      });

      // Actualizar estado local
      setReportes((prev) =>
        prev.map((r) =>
          r.id === corregirReporte.id
            ? {
                ...r,
                categoria: nuevaCategoria,
                tipoProblema: nuevoTipo,
                razonamientoIA: razonamiento,
                confianzaIA: 1.0, // 100% de confianza por revisión de administrador
              }
            : r
        )
      );

      setCorregirReporte(null);
      showToast(
        `Categoría del reporte ${corregirReporte.folio || corregirReporte.id} actualizada a: ${nuevaCategoria}`,
        'success'
      );
    } catch (err: any) {
      showToast('Error al actualizar categoría: ' + err.message, 'error');
    }
  };

  const handleSupervisionConfirm = async (
    idCuadrillaSupervisora: number,
    fechaSupervision: string,
    notas: string,
    cuadrillaNombre?: string
  ) => {
    if (!supervisionReporte) return;
    try {
      await reportesService.programarSupervision(supervisionReporte.id, {
        idCuadrillaSupervisora,
        fechaSupervision,
        notasSupervision: notas,
      });

      // Actualizar estado local
      setReportes((prev) =>
        prev.map((r) =>
          r.id === supervisionReporte.id
            ? {
                ...r,
                estatus: EstatusReporte.EnSupervision,
                idCuadrillaSupervisora,
                cuadrillaSupervisora: cuadrillaNombre || 'Cuadrilla Auditora',
                cuadrillaSupervisoraNombre: cuadrillaNombre || 'Cuadrilla Auditora',
                fechaSupervision,
                observacionesSupervision: notas,
              }
            : r
        )
      );

      setSupervisionReporte(null);
      showToast(
        `Visita de supervisión (RF-13) programada exitosamente con ${
          cuadrillaNombre || 'la cuadrilla auditora'
        }`,
        'success'
      );
    } catch (err: any) {
      showToast('Error al programar supervisión: ' + err.message, 'error');
    }
  };

  const handleNuevaCuadrillaConfirm = async (
    data: CuadrillaCreacionDTO & { telefonoContacto?: string; vehiculo?: string }
  ) => {
    try {
      const nueva = await cuadrillasService.create(data);
      setCuadrillas((prev) => [...prev, nueva]);
      setNuevaCuadrillaOpen(false);
      showToast(`Cuadrilla "${nueva.nombre}" registrada correctamente`, 'success');
    } catch (err: any) {
      showToast('Error al registrar cuadrilla: ' + err.message, 'error');
    }
  };

  const handleToggleDisponibilidad = async (id: number) => {
    try {
      const cuad = cuadrillas.find((c) => c.id === id);
      if (!cuad) return;

      const nuevoEstatus =
        cuad.estatusDisponibilidad === EstatusCuadrilla.Disponible
          ? EstatusCuadrilla.FueraServicio
          : EstatusCuadrilla.Disponible;

      const updated = await cuadrillasService.actualizarDisponibilidad(id, nuevoEstatus);
      setCuadrillas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated, disponible: nuevoEstatus === EstatusCuadrilla.Disponible } : c))
      );

      showToast(
        `Disponibilidad de "${cuad.nombre}" actualizada a ${
          nuevoEstatus === EstatusCuadrilla.Disponible ? 'Disponible' : 'En Mantenimiento'
        }`,
        'info'
      );
    } catch (err: any) {
      showToast('Error al actualizar disponibilidad: ' + err.message, 'error');
    }
  };

  // Si no hay sesión activa, mostrar pantalla de inicio de sesión
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Reporte activo para la pantalla de seguimiento
  const currentReporte =
    reportes.find((r) => r.id === selectedReporteId) || reportes[0];

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={(tab) => setCurrentTab(tab)}
      currentUser={currentUser}
      onLogout={handleLogout}
      isMockActive={isMockActive}
      onToggleMock={handleToggleMockMode}
      reportes={reportes}
      onRefresh={loadData}
      isRefreshing={refreshing}
      onSelectReporte={handleSelectReporte}
    >
      {/* Contenido según la pestaña activa */}
      {currentTab === 'dashboard' && (
        <DashboardScreen
          reportes={reportes}
          cuadrillas={cuadrillas}
          metrics={metrics}
          onSelectReporte={handleSelectReporte}
          onOpenAsignarModal={(r) => setAsignarReporte(r)}
          onOpenSupervisionModal={(r) => setSupervisionReporte(r)}
          onNavigateToReportes={() => setCurrentTab('reportes')}
          onNavigateToCuadrillas={() => setCurrentTab('cuadrillas')}
        />
      )}

      {currentTab === 'reportes' && (
        <ReportesScreen
          reportes={reportes}
          cuadrillas={cuadrillas}
          onSelectReporte={handleSelectReporte}
          onOpenAsignarModal={(r) => setAsignarReporte(r)}
          onOpenCorregirModal={(r) => setCorregirReporte(r)}
          onOpenSupervisionModal={(r) => setSupervisionReporte(r)}
        />
      )}

      {currentTab === 'seguimiento' && currentReporte && (
        <SeguimientoScreen
          reporte={currentReporte}
          cuadrillas={cuadrillas}
          onBack={() => setCurrentTab('reportes')}
          onOpenAsignarModal={(r) => setAsignarReporte(r)}
          onOpenCorregirModal={(r) => setCorregirReporte(r)}
          onOpenSupervisionModal={(r) => setSupervisionReporte(r)}
        />
      )}

      {currentTab === 'mapa' && (
        <MapaScreen
          reportes={reportes}
          cuadrillas={cuadrillas}
          onSelectReporte={handleSelectReporte}
          onOpenAsignarModal={(r) => setAsignarReporte(r)}
          onOpenCorregirModal={(r) => setCorregirReporte(r)}
        />
      )}

      {currentTab === 'cuadrillas' && (
        <CuadrillasScreen
          cuadrillas={cuadrillas}
          reportes={reportes}
          onOpenNuevaCuadrillaModal={() => setNuevaCuadrillaOpen(true)}
          onToggleDisponibilidad={handleToggleDisponibilidad}
          onViewReportesDeCuadrilla={() => setCurrentTab('reportes')}
        />
      )}

      {currentTab === 'indicadores' && (
        <IndicadoresScreen reportes={reportes} cuadrillas={cuadrillas} />
      )}

      {/* Modales Globales */}
      {asignarReporte && (
        <ModalAsignarCuadrilla
          reporte={asignarReporte}
          isOpen={!!asignarReporte}
          onClose={() => setAsignarReporte(null)}
          onConfirm={handleAsignarConfirm}
        />
      )}

      {corregirReporte && (
        <ModalCorregirCategoria
          reporte={corregirReporte}
          isOpen={!!corregirReporte}
          onClose={() => setCorregirReporte(null)}
          onConfirm={handleCorregirConfirm}
        />
      )}

      {supervisionReporte && (
        <ModalProgramarSupervision
          reporte={supervisionReporte}
          isOpen={!!supervisionReporte}
          onClose={() => setSupervisionReporte(null)}
          onConfirm={handleSupervisionConfirm}
        />
      )}

      {nuevaCuadrillaOpen && (
        <ModalNuevaCuadrilla
          isOpen={nuevaCuadrillaOpen}
          onClose={() => setNuevaCuadrillaOpen(false)}
          onConfirm={handleNuevaCuadrillaConfirm}
        />
      )}

      {/* Contenedor de Toasts Flotantes */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor:
                toast.tipo === 'success'
                  ? '#047857'
                  : toast.tipo === 'error'
                  ? '#B91C1C'
                  : '#1D4ED8',
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13.5px',
              fontWeight: 600,
              maxWidth: '380px',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {toast.tipo === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span style={{ flex: 1 }}>{toast.mensaje}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                opacity: 0.8,
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default App;
