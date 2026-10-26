import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  Truck,
  Filter,
  Layers,
  X,
  Eye,
  UserPlus,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, EstatusReporte } from '../types';
import { CategoriaBadge } from '../components/CategoriaBadge';
import { StatusBadge } from '../components/StatusBadge';
import { MapView, type MapFocusTarget } from '../components/MapView';
import { useUbicacionesCuadrillas } from '../hooks/useUbicacionesCuadrillas';
import { countVisibleReports, isValidCoordinatePair, toCrewMapPositions } from '../services/ubicacionesModel';
import { getReportesParaMapa } from '../services/mapaReportesService';

const ESTATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos los estatus' },
  { value: String(EstatusReporte.Nuevo), label: 'Nuevos' },
  { value: String(EstatusReporte.Asignado), label: 'Asignados' },
  { value: String(EstatusReporte.LevantandoInformacion), label: 'Levantando información' },
  { value: String(EstatusReporte.EnProceso), label: 'En proceso' },
  { value: String(EstatusReporte.Completado), label: 'Completados' },
  { value: String(EstatusReporte.EnSupervision), label: 'En supervisión' },
  { value: String(EstatusReporte.Cerrado), label: 'Cerrados' },
];

interface MapaScreenProps {
  reportes: ReporteDTO[];
  cuadrillas: CuadrillaDTO[];
  onSelectReporte: (reporteId: number) => void;
  onOpenAsignarModal: (reporte: ReporteDTO) => void;
  onOpenCorregirModal: (reporte: ReporteDTO) => void;
}

export const MapaScreen: React.FC<MapaScreenProps> = ({
  reportes,
  cuadrillas,
  onSelectReporte,
  onOpenAsignarModal,
  onOpenCorregirModal,
}) => {
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterEstatus, setFilterEstatus] = useState<string>('todos');
  const [showCuadrillas, setShowCuadrillas] = useState<boolean>(true);
  const [selectedReporteId, setSelectedReporteId] = useState<number | null>(null);
  const [mapReportes, setMapReportes] = useState<ReporteDTO[]>([]);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | undefined>();
  const focusRequestId = useRef(0);
  const reportsAbort = useRef<AbortController | null>(null);
  const { posiciones, estado: ubicacionesEstado, error: ubicacionesError } = useUbicacionesCuadrillas(true);
  const crewPositions = useMemo(() => toCrewMapPositions(posiciones), [posiciones]);

  const loadAllReportes = useCallback(async () => {
    reportsAbort.current?.abort();
    const controller = new AbortController();
    reportsAbort.current = controller;
    setReportsLoading(true);
    try {
      const all = await getReportesParaMapa(controller.signal);
      if (controller.signal.aborted) return;
      setMapReportes(all);
      setReportsError(null);
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return;
      setReportsError(error instanceof Error ? error.message : 'No se pudieron cargar todos los reportes.');
    } finally {
      if (!controller.signal.aborted) setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllReportes();
    const interval = setInterval(() => { void loadAllReportes(); }, 60_000);
    return () => {
      clearInterval(interval);
      reportsAbort.current?.abort();
    };
  }, [loadAllReportes]);

  // Filtrar reportes para el mapa
  const sourceReportes = mapReportes.length > 0 ? mapReportes : reportes;
  const filteredReportes = useMemo(() => {
    return sourceReportes.filter((r) => {
      const matchCat =
        filterCategoria === 'todas' ||
        (r.categoria &&
          r.categoria.toLowerCase().includes(filterCategoria.toLowerCase()));

      const matchEst =
        filterEstatus === 'todos' ||
        String(r.estatus) === filterEstatus;

      return matchCat && matchEst;
    });
  }, [sourceReportes, filterCategoria, filterEstatus]);

  // Reporte seleccionado para el Drawer
  const selectedReporte = sourceReportes.find((r) => r.id === selectedReporteId);
  const visibleCount = countVisibleReports(filteredReportes);

  const centrarMapa = () => {
    const target = selectedReporte ?? filteredReportes.find((reporte) =>
      isValidCoordinatePair(reporte.latitud, reporte.longitud));
    if (!target) return;
    focusRequestId.current += 1;
    setFocusTarget({
      latitud: target.latitud,
      longitud: target.longitud,
      requestId: focusRequestId.current,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: 'calc(100vh - var(--header-height) - 48px)',
        position: 'relative',
      }}
    >
      {/* Barra de Filtros Flotante Superior */}
      <div
        className="card"
        style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={18} color="var(--color-royal-blue)" />
            <span style={{ fontWeight: 800, fontSize: '14px' }}>
              Incidencias en el Mapa:
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-royal-blue)',
                backgroundColor: 'rgba(37, 60, 150, 0.1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {visibleCount} visibles{reportsLoading ? ' · actualizando…' : ''}
            </span>
          </div>

          {/* Filtro por Categoría */}
          <select
            aria-label="Filtrar por categoría"
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '12.5px',
              backgroundColor: 'var(--color-light-gray)',
              color: 'var(--color-dark-navy)',
              cursor: 'pointer',
            }}
          >
            <option value="todas">Todas las categorías</option>
            <option value="fuga">Fugas de agua</option>
            <option value="drenaje">Drenaje y alcantarillado</option>
            <option value="falta">Falta de agua / desabasto</option>
            <option value="presión">Baja presión</option>
            <option value="medidor">Medidor / Instalación</option>
          </select>

          {/* Filtro por Estatus */}
          <select
            aria-label="Filtrar por estatus"
            value={filterEstatus}
            onChange={(e) => setFilterEstatus(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '12.5px',
              backgroundColor: 'var(--color-light-gray)',
              color: 'var(--color-dark-navy)',
              cursor: 'pointer',
            }}
          >
            {ESTATUS_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Toggle para Cuadrillas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={showCuadrillas}
              onChange={(e) => setShowCuadrillas(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <Truck size={16} color="var(--color-royal-blue)" />
            <span>Ver cuadrillas ({cuadrillas.length})</span>
          </label>
          <button
            onClick={centrarMapa}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-royal-blue)',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Centrar mapa
          </button>
        </div>
      </div>

      {(reportsError || ubicacionesEstado === 'degradado' || ubicacionesError) && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #F5C26B',
            backgroundColor: '#FFF7E6',
            color: '#92400E',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>
            {reportsError && `Reportes: ${reportsError}`}
            {reportsError && (ubicacionesError || ubicacionesEstado === 'degradado') && ' · '}
            {showCuadrillas && (ubicacionesError || ubicacionesEstado === 'degradado')
              && `Ubicaciones: ${ubicacionesError || 'conexión en tiempo real degradada'}`}
          </span>
          {reportsError && (
            <button
              onClick={() => { void loadAllReportes(); }}
              style={{
                border: '1px solid #B45309', background: 'transparent', color: '#92400E',
                borderRadius: '5px', padding: '3px 8px', fontSize: '11.5px', cursor: 'pointer',
              }}
            >
              Reintentar reportes
            </button>
          )}
        </div>
      )}

      {/* Contenedor del Mapa con Drawer Lateral */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <MapView
          reportes={filteredReportes}
          cuadrillas={showCuadrillas ? cuadrillas : []}
          crewPositions={showCuadrillas ? crewPositions : []}
          onSelectReporte={(id) => setSelectedReporteId(id)}
          focusTarget={focusTarget}
          height="100%"
        />

        {/* Drawer Lateral Desplegable al Seleccionar un Reporte */}
        {selectedReporte && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              bottom: '16px',
              width: '380px',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--color-border)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Header del Drawer */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-royal-blue)',
                color: 'var(--color-white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-soft-aqua)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Detalle del Reporte
                </span>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--color-white)',
                    margin: '2px 0 0',
                  }}
                >
                  {selectedReporte.folio}
                </h3>
              </div>

              <button
                aria-label="Cerrar detalle"
                onClick={() => setSelectedReporteId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-white)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del Drawer */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Badges de Categoría y Estatus */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <CategoriaBadge
                  categoria={selectedReporte.categoria}
                  confianzaIA={selectedReporte.confianzaIA}
                  razonamientoIA={selectedReporte.razonamientoIA}
                  size="md"
                />
                <StatusBadge status={selectedReporte.estatus} />
              </div>

              {/* Razonamiento IA Box */}
              {selectedReporte.razonamientoIA && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(0, 87, 217, 0.06)',
                    border: '1px solid rgba(0, 87, 217, 0.18)',
                    fontSize: '12px',
                    color: 'var(--color-text-body)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--color-royal-blue)',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Razonamiento IA ({Math.round((selectedReporte.confianzaIA ?? 0.9) * 100)}%)</span>
                  </div>
                  "{selectedReporte.razonamientoIA}"
                </div>
              )}

              {/* Descripción */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Descripción
                </span>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-dark-navy)',
                    marginTop: '4px',
                    lineHeight: 1.4,
                  }}
                >
                  {selectedReporte.descripcion}
                </p>
              </div>

              {/* Ubicación */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Dirección
                </span>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-dark-navy)',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MapPin size={15} color="var(--color-royal-blue)" />
                  <span>
                    {selectedReporte.direccion || 'Sin dirección registrada'}
                  </span>
                </div>
              </div>

              {/* Ciudadano */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Ciudadano Reportante
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {selectedReporte.nombreCiudadano || 'Anónimo'} (
                  {selectedReporte.telefonoCiudadano || 'Sin teléfono'})
                </div>
              </div>

              {/* Cuadrilla */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Cuadrilla Asignada
                </span>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: selectedReporte.cuadrillaAsignada
                      ? 'var(--color-royal-blue)'
                      : 'var(--color-orange)',
                    marginTop: '2px',
                  }}
                >
                  {selectedReporte.cuadrillaAsignada || 'Sin asignar'}
                </div>
              </div>
            </div>

            {/* Footer con Acciones */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-light-gray)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <button
                onClick={() => onSelectReporte(selectedReporte.id)}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '13px' }}
              >
                <Eye size={16} />
                <span>Ver Seguimiento Detallado</span>
              </button>

              <button
                onClick={centrarMapa}
                className="btn"
                style={{ width: '100%', fontSize: '13px', backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)' }}
              >
                Centrar en el mapa
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => onOpenAsignarModal(selectedReporte)}
                  className="btn"
                  style={{
                    backgroundColor: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px',
                    padding: '8px',
                  }}
                >
                  <UserPlus size={14} />
                  <span>Asignar</span>
                </button>

                <button
                  onClick={() => onOpenCorregirModal(selectedReporte)}
                  className="btn"
                  style={{
                    backgroundColor: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px',
                    padding: '8px',
                  }}
                >
                  <Sparkles size={14} color="var(--color-royal-blue)" />
                  <span>Corregir IA</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
