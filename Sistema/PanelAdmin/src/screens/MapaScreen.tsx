import React, { useState, useMemo } from 'react';
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
import { ReporteDTO, CuadrillaDTO } from '../types';
import { CategoriaBadge } from '../components/CategoriaBadge';
import { StatusBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapView';

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

  // Filtrar reportes para el mapa
  const filteredReportes = useMemo(() => {
    return reportes.filter((r) => {
      const matchCat =
        filterCategoria === 'todas' ||
        (r.categoria &&
          r.categoria.toLowerCase().includes(filterCategoria.toLowerCase()));

      const matchEst =
        filterEstatus === 'todos' ||
        r.estatus.toLowerCase() === filterEstatus.toLowerCase();

      return matchCat && matchEst;
    });
  }, [reportes, filterCategoria, filterEstatus]);

  // Reporte seleccionado para el Drawer
  const selectedReporte = reportes.find((r) => r.id === selectedReporteId);

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
              {filteredReportes.length} visibles
            </span>
          </div>

          {/* Filtro por Categoría */}
          <select
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
            <option value="todos">Todos los estatus</option>
            <option value="Pendiente">Pendientes</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Resuelto">Resueltos</option>
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
            <span>Ver Cuadrillas en Ruta ({cuadrillas.length})</span>
          </label>
        </div>
      </div>

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
          onSelectReporte={(id) => setSelectedReporteId(id)}
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
