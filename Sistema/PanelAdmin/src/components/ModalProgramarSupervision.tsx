import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { ReporteDTO, CuadrillaDTO } from '../types';
import { cuadrillasService } from '../services/cuadrillasService';
import { CuadrillaStatusBadge } from './StatusBadge';

interface ModalProgramarSupervisionProps {
  reporte: ReporteDTO;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (idCuadrillaSupervisora: number, fechaSupervision: string, notas: string, cuadrillaNombre?: string) => Promise<void>;
}

export const ModalProgramarSupervision: React.FC<ModalProgramarSupervisionProps> = ({
  reporte,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [cuadrillas, setCuadrillas] = useState<CuadrillaDTO[]>([]);
  const [selectedCuadrillaId, setSelectedCuadrillaId] = useState<number | null>(null);
  const [fechaSupervision, setFechaSupervision] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [notas, setNotas] = useState<string>(
    'Verificar calidad del sellado, bacheo de carpeta asfáltica y conformidad del ciudadano.'
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
          // Elegir una cuadrilla diferente a la que atendió el reporte
          const distintas = list.filter((c) => c.id !== reporte.idCuadrillaAsignada);
          if (distintas.length > 0) {
            setSelectedCuadrillaId(distintas[0].id);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, reporte.idCuadrillaAsignada]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuadrillaId) {
      setError('Debes seleccionar una cuadrilla supervisora.');
      return;
    }

    if (selectedCuadrillaId === reporte.idCuadrillaAsignada) {
      setError('La cuadrilla supervisora debe ser distinta a la cuadrilla que atendió el reporte (Regla RF-13).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const crew = cuadrillas.find((c) => c.id === selectedCuadrillaId);
      await onConfirm(selectedCuadrillaId, fechaSupervision, notas, crew?.nombre);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al programar supervisión');
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
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} style={{ color: '#22C55E' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                Programar Visita de Supervisión
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94A3B8' }}>
                Cumplimiento de Calidad Posterior a la Resolución (RF-13 / CU-06)
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

          {/* Cuadrilla que atendió originalmente el reporte */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#92400E',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, color: '#D97706' }} />
            <div>
              <strong>Cuadrilla que resolvió:</strong>{' '}
              {reporte.cuadrillaAsignadaNombre || 'Cuadrilla previa'}.
              <div style={{ fontSize: '11.5px', color: '#B45309', marginTop: '2px' }}>
                Por norma de auditoría, se debe designar una cuadrilla supervisora distinta.
              </div>
            </div>
          </div>

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
              Seleccionar Cuadrilla Supervisora:
            </label>

            {loading ? (
              <p style={{ fontSize: '13px', color: '#64748B' }}>Cargando cuadrillas...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {cuadrillas.map((c) => {
                  const isAttendingCrew = c.id === reporte.idCuadrillaAsignada;
                  const isSelected = selectedCuadrillaId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => !isAttendingCrew && setSelectedCuadrillaId(c.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: isAttendingCrew
                          ? '1px dashed #CBD5E1'
                          : isSelected
                          ? '2px solid #253C96'
                          : '1px solid #E2E8F0',
                        backgroundColor: isAttendingCrew
                          ? '#F8FAFC'
                          : isSelected
                          ? '#EFF6FF'
                          : '#FFFFFF',
                        opacity: isAttendingCrew ? 0.6 : 1,
                        cursor: isAttendingCrew ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #253C96' : '2px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#1E293B' }}>{c.nombre}</strong>
                          {isAttendingCrew && (
                            <span style={{ fontSize: '11px', color: '#EF4444', display: 'block' }}>
                              (Atendió el reporte - No elegible)
                            </span>
                          )}
                        </div>
                      </div>
                      <CuadrillaStatusBadge estatus={c.estatusDisponibilidad} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
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
              <Calendar size={16} style={{ color: '#253C96' }} />
              Fecha y Hora programada para la visita:
            </label>
            <input
              type="datetime-local"
              value={fechaSupervision}
              onChange={(e) => setFechaSupervision(e.target.value)}
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
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#1E293B',
                marginBottom: '8px',
              }}
            >
              Criterios e instrucciones de supervisión:
            </label>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones para la cuadrilla supervisora..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#1E293B',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
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
                backgroundColor: '#253C96',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Programando...' : 'Confirmar Supervisión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
