import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  Navigation,
  Play,
  Crosshair,
  RotateCw,
  Image,
  ChevronRight,
} from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, EstatusReporte, EvidenciaDTO, ReporteDetalleDTO } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PrioridadBadge } from '../components/PrioridadBadge';
import { MapView } from '../components/MapView';
import { reportesService } from '../services/reportesService';
import fugaImg from '../assets/fuga-ejemplo.png';

interface SeguimientoScreenProps {
  reporte: ReporteDTO;
  cuadrillas: CuadrillaDTO[];
  onBack: () => void;
  onOpenAsignarModal: (reporte: ReporteDTO) => void;
  onOpenCorregirModal: (reporte: ReporteDTO) => void;
  onOpenSupervisionModal: (reporte: ReporteDTO) => void;
  onActualizarReporte?: (reporteActualizado: Partial<ReporteDTO>) => Promise<void>;
}

export const SeguimientoScreen: React.FC<SeguimientoScreenProps> = ({
  reporte,
  cuadrillas,
  onBack,
  onOpenAsignarModal,
  onOpenCorregirModal,
  onOpenSupervisionModal,
  onActualizarReporte,
}) => {
  const [currentReporte, setCurrentReporte] = useState<ReporteDetalleDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReevaluating, setIsReevaluating] = useState<boolean>(false);
  const [selectedCuadrilla, setSelectedCuadrilla] = useState<string>(
    reporte.cuadrillaAsignadaNombre || ''
  );
  const [showTiempoEstimadoBox, setShowTiempoEstimadoBox] = useState<boolean>(false);
  const [tiempoEstimadoMinutos, setTiempoEstimadoMinutos] = useState<string>(
    reporte.tiempoEstimado ? String(reporte.tiempoEstimado) : '45'
  );
  const [ubicacionMarcada, setUbicacionMarcada] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const loadReporteDetalle = async () => {
      try {
        const detalle = await reportesService.getById(reporte.id);
        setCurrentReporte(detalle);
      } catch (err) {
        console.error('Error cargando detalle del reporte:', err);
        // Fallback al reporte base si falla
        setCurrentReporte({ ...reporte, evidencias: [], seguimientosUbicacion: [] } as ReporteDetalleDTO);
      } finally {
        setIsLoading(false);
      }
    };
    loadReporteDetalle();
  }, [reporte.id]);

  useEffect(() => {
    if (currentReporte && reporte) {
      setCurrentReporte(prev => prev ? { ...prev, ...reporte } : null);
    }
  }, [reporte]);

  const handleReevaluarPrioridad = async () => {
    if (!currentReporte) return;
    setIsReevaluating(true);
    try {
      const updated = await reportesService.revaluarPrioridad(currentReporte.id);
      setCurrentReporte((prev) => prev ? {
        ...prev,
        prioridad: updated.prioridad,
        scorePrioridad: updated.scorePrioridad,
        justificacionPrioridad: updated.justificacionPrioridad,
      } : null);
      if (onActualizarReporte) {
        await onActualizarReporte({
          prioridad: updated.prioridad,
          scorePrioridad: updated.scorePrioridad,
          justificacionPrioridad: updated.justificacionPrioridad,
        });
      }
    } catch (err) {
      console.error('Error al reevaluar prioridad con IA:', err);
      alert('No se pudo reevaluar la prioridad con el agente IA.');
    } finally {
      setIsReevaluating(false);
    }
  };

  const isResuelto =
    currentReporte?.estatus === EstatusReporte.Completado ||
    currentReporte?.estatus === EstatusReporte.Cerrado ||
    String(currentReporte?.estatus || '').toLowerCase().includes('resuelto');

  // Acción para marcar/resaltar la ubicación (Figma Comentario #11)
  const handleMarcarUbicacion = () => {
    setUbicacionMarcada(true);
    setTimeout(() => setUbicacionMarcada(false), 3000);
  };

  // Confirmar atención del reporte con tiempo estimado (Figma Comentario #11)
  const handleConfirmarAtencion = async () => {
    setIsSubmitting(true);
    try {
      const minutos = parseInt(tiempoEstimadoMinutos, 10) || 45;
      const crewObj = cuadrillas.find((c) => c.nombre === selectedCuadrilla);

      if (onActualizarReporte) {
        await onActualizarReporte({
          estatus: EstatusReporte.EnProceso,
          idCuadrillaAsignada: crewObj?.id,
          cuadrillaAsignadaNombre: selectedCuadrilla || currentReporte?.cuadrillaAsignadaNombre,
          tiempoEstimado: minutos,
        });
      }
      setShowTiempoEstimadoBox(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '10px 0',
        fontFamily: "var(--font-family-base, 'Inria Sans', sans-serif)",
      }}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div style={{ fontSize: '16px', color: '#64748B' }}>Cargando detalle del reporte...</div>
        </div>
      ) : currentReporte ? (
        <>
        {/* Botón Volver y Título del Reporte (Exacto a Figma) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#0057D9',
            fontWeight: 700,
            fontSize: '14px',
            padding: '6px 10px',
            borderRadius: '6px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeft size={16} />
          <span>Volver a reportes</span>
        </button>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#19244E',
            margin: 0,
            fontFamily: "var(--font-family-heading, 'Inria Sans', sans-serif)",
          }}
        >
          {currentReporte?.categoria || currentReporte?.descripcion || 'Fuga en vía pública'}
        </h1>

        <span
          style={{
            fontSize: '13px',
            color: '#64748B',
            fontWeight: 700,
            backgroundColor: '#F1F5F9',
            padding: '4px 10px',
            borderRadius: '6px',
          }}
        >
          Folio: {currentReporte?.folio || `REP-${currentReporte?.id || reporte.id}`}
        </span>
      </div>

      {/* Grid de 2 Columnas Exacto al Diseño de Figma */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '36px',
          alignItems: 'start',
        }}
      >
        {/* Columna Izquierda: Foto de la fuga, Descripción y Mapa de Ubicación */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Foto de la Incidencia */}
          <div
            style={{
              width: '100%',
              height: '280px',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#F1F5F9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #E2E8F0',
              position: 'relative',
            }}
          >
            {currentReporte.evidencias && currentReporte.evidencias.length > 0 ? (
              <div style={{ display: 'flex', height: '100%', overflowX: 'auto', gap: '8px', padding: '8px' }}>
                {currentReporte.evidencias.map((ev, i) => (
                  <div key={ev.id || i} style={{ flex: '0 0 200px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={ev.archivoUrl}
                      alt={`Evidencia ${i + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(25, 36, 78, 0.85)',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {ev.tipo === 1 ? 'Evidencia Inicial' : 'Evidencia de Resolución'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <img
                  src={fugaImg}
                  alt="Evidencia del reporte"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(25, 36, 78, 0.85)',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  Evidencia fotográfica adjunta
                </div>
              </>
            )}
          </div>

          {/* Texto Descriptivo del Ciudadano */}
          <div
            style={{
              fontSize: '14.5px',
              color: '#334155',
              lineHeight: 1.6,
              backgroundColor: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
              Descripción del reporte
            </div>
            "{currentReporte?.descripcion || 'Fuga de agua en la vía pública con derrame continuo sobre banqueta.'}"
          </div>

          {/* Mapa de Ubicación con Botón para Marcar Ubicación (Figma Comentario #11) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#19244E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={16} color="#0057D9" />
                <span>{currentReporte?.direccion || 'Ubicación registrada en mapa'}</span>
              </div>

              {/* Botón para Marcar Ubicación de Figma (Comentario #11) */}
              <button
                onClick={handleMarcarUbicacion}
                title="Centrar y marcar ubicación exacta en el mapa"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #0057D9',
                  backgroundColor: ubicacionMarcada ? '#EFF6FF' : '#FFFFFF',
                  color: '#0057D9',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: ubicacionMarcada ? '0 0 0 3px rgba(0, 87, 217, 0.2)' : 'none',
                }}
              >
                <Crosshair size={14} color="#0057D9" />
                <span>{ubicacionMarcada ? '¡Ubicación Marcada!' : 'Marcar ubicación'}</span>
              </button>
            </div>

            <div
              style={{
                height: '240px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: ubicacionMarcada ? '2px solid #0057D9' : '1px solid #E2E8F0',
                boxShadow: ubicacionMarcada
                  ? '0 4px 14px rgba(0, 87, 217, 0.25)'
                  : '0 2px 6px rgba(0,0,0,0.06)',
                transition: 'all 0.25s ease',
              }}
            >
              <MapView
                reportes={currentReporte ? [currentReporte] : [reporte]}
                cuadrillas={cuadrillas}
                height="240px"
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Metadatos, Asignación de Cuadrilla y Acciones de Figma */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tarjeta de Metadatos (Figma: Hora de registro, Prioridad, Estado) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 2px 6px rgba(25, 36, 78, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Hora de registro */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>
                Hora de registro
              </span>
              <span style={{ fontSize: '14px', color: '#19244E', fontWeight: 700 }}>
                {new Date(currentReporte?.fechaCreacion || currentReporte?.fechaRecibido || Date.now()).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                (hace 36min)
              </span>
            </div>

            {/* Prioridad con PrioridadBadge reactivo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>
                Prioridad
              </span>
              <PrioridadBadge
                prioridad={currentReporte.prioridad}
                scorePrioridad={currentReporte.scorePrioridad}
                justificacion={currentReporte.justificacionPrioridad}
                size="md"
                showTooltip={true}
              />
            </div>

            {/* Estado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>
                Estado
              </span>
              <StatusBadge estatus={currentReporte.estatus} size="md" />
            </div>

            {/* Tiempo estimado actual */}
            {currentReporte.tiempoEstimado && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} color="#F36B2E" />
                  Tiempo estimado
                </span>
                <span style={{ fontSize: '13.5px', color: '#F36B2E', fontWeight: 800 }}>
                  {currentReporte.tiempoEstimado} minutos
                </span>
              </div>
            )}

            {/* Clasificación & Triage de Prioridad por Agente IA */}
            <div
              style={{
                marginTop: '10px',
                paddingTop: '16px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#253C96',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={14} color="#F36B2E" />
                  Agente IA (NVIDIA Llama)
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleReevaluarPrioridad}
                    disabled={isReevaluating}
                    title="Re-evaluar severidad y prioridad con el Agente IA"
                    style={{
                      background: 'none',
                      border: '1px solid #FDBA74',
                      color: isReevaluating ? '#94A3B8' : '#EA580C',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: isReevaluating ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: isReevaluating ? '#F1F5F9' : '#FFF7ED',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <RotateCw
                      size={12}
                      style={{
                        animation: isReevaluating ? 'spin 1s linear infinite' : 'none',
                      }}
                    />
                    <span>{isReevaluating ? 'Re-evaluando...' : 'Re-evaluar con IA'}</span>
                  </button>

                  <button
                    onClick={() => onOpenCorregirModal(currentReporte)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0057D9',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Corregir
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13.5px', color: '#19244E', fontWeight: 700 }}>
                  {currentReporte.categoria || 'Sin clasificación'}
                </div>

                {currentReporte.confianzaIA && (
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Confianza: <strong>{Math.round(currentReporte.confianzaIA * 100)}%</strong>
                  </div>
                )}
              </div>

              {/* Justificación del Agente IA de Priorización */}
              {currentReporte.justificacionPrioridad && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#334155',
                    backgroundColor: '#F8FAFC',
                    borderLeft: '3px solid #F36B2E',
                    padding: '8px 10px',
                    borderRadius: '0 6px 6px 0',
                    lineHeight: 1.45,
                    marginTop: '4px',
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Criterio de Prioridad del Agente
                  </div>
                  "{currentReporte.justificacionPrioridad}"
                </div>
              )}

              {currentReporte.razonamientoIA && !currentReporte.justificacionPrioridad && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    backgroundColor: '#F8FAFC',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    marginTop: '4px',
                    fontStyle: 'italic',
                  }}
                >
                  "{currentReporte.razonamientoIA}"
                </div>
              )}
            </div>
          </div>

          {/* Asignar cuadrilla y Atender Reporte con recuadro de tiempo estimado (Figma Comentario #11) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 2px 6px rgba(25, 36, 78, 0.04)',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 700,
                color: '#19244E',
                marginBottom: '12px',
              }}
            >
              {isResuelto ? 'Supervisión del reporte completado' : 'Asignar cuadrilla de atención'}
            </label>

            {/* Dropdown de Cuadrilla */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <select
                value={selectedCuadrilla}
                onChange={(e) => setSelectedCuadrilla(e.target.value)}
                style={{
                  width: '100%',
                  appearance: 'none',
                  padding: '12px 36px 12px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: selectedCuadrilla ? '#19244E' : '#94A3B8',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">
                  {currentReporte?.cuadrillaAsignadaNombre || 'Elige una cuadrilla...'}
                </option>
                {cuadrillas.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre} ({c.disponible ? 'Disponible' : 'En servicio'})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                color="#64748B"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>

            {/* Recuadro para asignar tiempo estimado tras dar clic en atender (Figma Comentario #11) */}
            {showTiempoEstimadoBox && !isResuelto && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FDBA74',
                  borderRadius: '8px',
                  animation: 'fadeIn 0.2s ease-out',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#9A3412',
                    marginBottom: '8px',
                  }}
                >
                  <Clock size={15} color="#F36B2E" />
                  <span>Asignar tiempo estimado de resolución (minutos):</span>
                </label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={tiempoEstimadoMinutos}
                    onChange={(e) => setTiempoEstimadoMinutos(e.target.value)}
                    placeholder="ej. 45"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #F97316',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#19244E',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                  <span style={{ alignSelf: 'center', fontSize: '13px', fontWeight: 600, color: '#9A3412' }}>
                    minutos
                  </span>
                </div>

                {/* Accesos rápidos de tiempo */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {['30', '45', '60', '90', '120'].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTiempoEstimadoMinutos(mins)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: tiempoEstimadoMinutos === mins ? '1px solid #EA580C' : '1px solid #FED7AA',
                        backgroundColor: tiempoEstimadoMinutos === mins ? '#EA580C' : '#FFFFFF',
                        color: tiempoEstimadoMinutos === mins ? '#FFFFFF' : '#9A3412',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowTiempoEstimadoBox(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarAtencion}
                    disabled={isSubmitting}
                    style={{
                      flex: 2,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--gradient-orange)',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(243, 107, 46, 0.3)',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Confirmar atención</span>
                  </button>
                </div>
              </div>
            )}

            {/* Botón Principal de Acción (Gradiente Oficial de Figma) */}
            {isResuelto ? (
              <button
                onClick={() => onOpenSupervisionModal(currentReporte!)}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'var(--gradient-orange)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(243, 107, 46, 0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 107, 46, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(243, 107, 46, 0.35)';
                }}
              >
                <ClipboardCheck size={18} />
                <span>Programar visita de supervisión</span>
              </button>
            ) : !showTiempoEstimadoBox ? (
              <button
                onClick={() => {
                  // Figma Comentario #11: Mostrar recuadro para asignar tiempo estimado
                  setShowTiempoEstimadoBox(true);
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'var(--gradient-orange)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(243, 107, 46, 0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 107, 46, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(243, 107, 46, 0.35)';
                }}
              >
                <Play size={16} fill="#FFFFFF" />
                <span>Atender reporte (Marcar en proceso)</span>
              </button>
            ) : null}

            {currentReporte?.cuadrillaAsignadaNombre && (
              <div
                style={{
                  marginTop: '14px',
                  fontSize: '12.5px',
                  color: '#059669',
                  textAlign: 'center',
                  fontWeight: 700,
                  backgroundColor: '#ECFDF5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #A7F3D0',
                }}
              >
                Cuadrilla asignada: {currentReporte.cuadrillaAsignadaNombre}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div style={{ fontSize: '16px', color: '#EF4444' }}>No se pudo cargar el detalle del reporte</div>
        </div>
      )}
    </div>
  );
};
