import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, EstatusReporte } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapView';
import fugaImg from '../assets/fuga-ejemplo.png';

interface SeguimientoScreenProps {
  reporte: ReporteDTO;
  cuadrillas: CuadrillaDTO[];
  onBack: () => void;
  onOpenAsignarModal: (reporte: ReporteDTO) => void;
  onOpenCorregirModal: (reporte: ReporteDTO) => void;
  onOpenSupervisionModal: (reporte: ReporteDTO) => void;
}

export const SeguimientoScreen: React.FC<SeguimientoScreenProps> = ({
  reporte,
  cuadrillas,
  onBack,
  onOpenAsignarModal,
  onOpenCorregirModal,
  onOpenSupervisionModal,
}) => {
  const [selectedCuadrilla, setSelectedCuadrilla] = useState<string>(
    reporte.cuadrillaAsignadaNombre || ''
  );

  const isResuelto =
    reporte.estatus === EstatusReporte.Completado ||
    reporte.estatus === EstatusReporte.Cerrado ||
    String(reporte.estatus).toLowerCase().includes('resuelto');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '10px 0',
      }}
    >
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
            fontSize: '13.5px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#19244E',
            margin: 0,
          }}
        >
          {reporte.categoria || reporte.descripcion || 'Fuga en via publica'}
        </h1>

        <span
          style={{
            fontSize: '13px',
            color: '#64748B',
            fontWeight: 600,
          }}
        >
          Folio: {reporte.folio || `REP-${reporte.id}`}
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
            }}
          >
            <img
              src={fugaImg}
              alt="Evidencia del reporte"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
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
            }}
          >
            "{reporte.descripcion || 'Fuga de agua en la vía pública con derrame continuo sobre banqueta.'}"
          </div>

          {/* Mapa de Ubicación */}
          <div>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#19244E',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MapPin size={16} color="#0057D9" />
              <span>{reporte.direccion || 'Ubicación registrada'}</span>
            </div>

            <div
              style={{
                height: '240px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}
            >
              <MapView
                reportes={[reporte]}
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
              <span style={{ fontSize: '14px', color: '#19244E', fontWeight: 600 }}>
                {new Date(reporte.fechaCreacion || reporte.fechaRecibido || Date.now()).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                (hace 36min)
              </span>
            </div>

            {/* Prioridad */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>
                Prioridad
              </span>
              <span style={{ fontSize: '14px', color: '#19244E', fontWeight: 700 }}>
                {reporte.prioridad || 'Alta'}
              </span>
            </div>

            {/* Estado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>
                Estado
              </span>
              <StatusBadge estatus={reporte.estatus} size="md" />
            </div>

            {/* Clasificación IA */}
            <div
              style={{
                marginTop: '10px',
                paddingTop: '16px',
                borderTop: '1px solid #F1F5F9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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

                <button
                  onClick={() => onOpenCorregirModal(reporte)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0057D9',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Corregir
                </button>
              </div>

              <div style={{ fontSize: '13px', color: '#19244E', fontWeight: 600 }}>
                {reporte.categoria || 'Sin clasificación'}
              </div>

              {reporte.confianzaIA && (
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Nivel de confianza: <strong>{Math.round(reporte.confianzaIA * 100)}%</strong>
                </div>
              )}

              {reporte.razonamientoIA && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    backgroundColor: '#F8FAFC',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    marginTop: '8px',
                    fontStyle: 'italic',
                  }}
                >
                  "{reporte.razonamientoIA}"
                </div>
              )}
            </div>
          </div>

          {/* Asignar cuadrilla (Figma: Dropdown y Botón Orange #F36B2E) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
              {isResuelto ? 'Cuadrilla de supervisión (RF-13)' : 'Asignar cuadrilla'}
            </label>

            {/* Dropdown de Cuadrilla */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
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
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">
                  {reporte.cuadrillaAsignadaNombre || 'Elige una cuadrilla...'}
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

            {/* Botón Naranja de Acción Principal de Figma (#F36B2E) */}
            {isResuelto ? (
              <button
                onClick={() => onOpenSupervisionModal(reporte)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#F36B2E', // Naranja primario de Figma
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(243, 107, 46, 0.3)',
                }}
              >
                <ClipboardCheck size={16} />
                <span>Programar visita de supervisión</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAsignarModal(reporte)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#F36B2E', // Naranja primario de Figma
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(243, 107, 46, 0.3)',
                }}
              >
                <span>Marcar en proceso</span>
              </button>
            )}

            {reporte.cuadrillaAsignadaNombre && (
              <div
                style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: '#059669',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                Cuadrilla actual: {reporte.cuadrillaAsignadaNombre}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
