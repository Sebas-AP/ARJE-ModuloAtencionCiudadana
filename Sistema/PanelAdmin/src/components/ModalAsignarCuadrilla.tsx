import React, { useState, useEffect } from 'react';
import { X, Users, Clock, CheckCircle2 } from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, EstatusCuadrilla } from '../types';
import { cuadrillasService } from '../services/cuadrillasService';
import { CuadrillaStatusBadge } from './StatusBadge';

interface ModalAsignarCuadrillaProps {
  reporte: ReporteDTO;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (idCuadrilla: number, tiempoEstimadoMinutos?: number, cuadrillaNombre?: string) => Promise<void>;
}

export const ModalAsignarCuadrilla: React.FC<ModalAsignarCuadrillaProps> = ({
  reporte,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [cuadrillas, setCuadrillas] = useState<CuadrillaDTO[]>([]);
  const [selectedCuadrillaId, setSelectedCuadrillaId] = useState<number | null>(
    reporte.idCuadrillaAsignada || null
  );
  const [tiempoEstimado, setTiempoEstimado] = useState<string>(
    reporte.tiempoEstimado ? String(reporte.tiempoEstimado) : '45'
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      cuadrillasService
        .getAll()
        .then((list) => {
          setCuadrillas(list);
          if (!selectedCuadrillaId && list.length > 0) {
            // Pre-select first available crew
            const disponible = list.find((c) => c.estatusDisponibilidad === EstatusCuadrilla.Disponible);
            if (disponible) setSelectedCuadrillaId(disponible.id);
            else setSelectedCuadrillaId(list[0].id);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuadrillaId) {
      setError('Debes seleccionar una cuadrilla para asignar.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const crew = cuadrillas.find((c) => c.id === selectedCuadrillaId);
      const minutos = tiempoEstimado ? parseInt(tiempoEstimado, 10) : undefined;
      await onConfirm(selectedCuadrillaId, minutos, crew?.nombre);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al asignar cuadrilla');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header del Modal */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#253C96',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} style={{ color: '#C4E7E5' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                Asignar Cuadrilla de Trabajo
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#E0F2FE', opacity: 0.9 }}>
                Reporte: <strong>{reporte.folio || `#${reporte.id}`}</strong> — {reporte.categoria || 'Incidencia de agua'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#1E293B',
                marginBottom: '8px',
              }}
            >
              Elige una cuadrilla disponible:
            </label>

            {loading ? (
              <p style={{ fontSize: '13px', color: '#64748B' }}>Cargando cuadrillas...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                {cuadrillas.map((c) => {
                  const isSelected = selectedCuadrillaId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCuadrillaId(c.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #253C96' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #253C96' : '2px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                            {c.nombre}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>
                            {c.integrantes || 'Personal técnico'}
                          </div>
                        </div>
                      </div>
                      <CuadrillaStatusBadge estatus={c.estatusDisponibilidad} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#1E293B',
                marginBottom: '8px',
              }}
            >
              <Clock size={16} style={{ color: '#253C96' }} />
              Tiempo estimado de resolución (minutos):
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={tiempoEstimado}
              onChange={(e) => setTiempoEstimado(e.target.value)}
              placeholder="Ej. 45"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                color: '#1E293B',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', marginTop: '4px' }}>
              Estimación inicial que se enviará a la cuadrilla (CU-08).
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#F36B2E',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px rgba(243, 107, 46, 0.25)',
              }}
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Asignando...' : 'Asignar y Notificar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
