import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { ReporteDTO, TipoProblema } from '../types';

interface ModalCorregirCategoriaProps {
  reporte: ReporteDTO;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nuevaCategoria: string, nuevoTipoProblema: TipoProblema, razonamiento: string) => Promise<void>;
}

const CATEGORIAS_CATALOGO: { categoria: string; tipo: TipoProblema; desc: string }[] = [
  { categoria: 'Fuga en vía pública', tipo: TipoProblema.Fuga, desc: 'Brote de agua en calle, banqueta o camellón.' },
  { categoria: 'Fuga domiciliaria', tipo: TipoProblema.Fuga, desc: 'Fuga dentro de predio o acometida particular.' },
  { categoria: 'Baja presión del agua', tipo: TipoProblema.FaltaAbastecimiento, desc: 'Flujo mínimo de agua en tomas domiciliarias.' },
  { categoria: 'Falta de abastecimiento', tipo: TipoProblema.FaltaAbastecimiento, desc: 'Corte total del suministro en la zona.' },
  { categoria: 'Suministro intermitente', tipo: TipoProblema.FaltaAbastecimiento, desc: 'Agua disponible solo en ciertos horarios.' },
  { categoria: 'Instalación rota', tipo: TipoProblema.InstalacionRota, desc: 'Tubería, válvula o codo fracturado.' },
  { categoria: 'Medidor dañado', tipo: TipoProblema.InstalacionRota, desc: 'Medidor de flujo roto, alterado o fugando.' },
  { categoria: 'Registro dañado o sin tapa', tipo: TipoProblema.InstalacionRota, desc: 'Alcantarilla o caja de registro destapada o rota.' },
  { categoria: 'Hundimiento o socavón por fuga', tipo: TipoProblema.Fuga, desc: 'Afectación profunda del suelo por fuga subterránea.' },
  { categoria: 'Agua contaminada o sucia', tipo: TipoProblema.Otro, desc: 'Agua con sedimentos, turbidez o mal olor.' },
  { categoria: 'Uso indebido', tipo: TipoProblema.UsoIndebido, desc: 'Lavado excesivo con manguera, riego prohibido o tomas clandestinas.' },
  { categoria: 'Otro', tipo: TipoProblema.Otro, desc: 'Otra eventualidad técnica de agua potable.' },
];

export const ModalCorregirCategoria: React.FC<ModalCorregirCategoriaProps> = ({
  reporte,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(
    reporte.categoria || 'Fuga en vía pública'
  );
  const [razonamiento, setRazonamiento] = useState<string>(
    'Corrección manual efectuada por el administrador tras revisión del reporte.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const match = CATEGORIAS_CATALOGO.find((c) => c.categoria === categoriaSeleccionada);
      const tipo = match ? match.tipo : TipoProblema.Otro;
      await onConfirm(categoriaSeleccionada, tipo, razonamiento);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar categoría');
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
          maxWidth: '580px',
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
            backgroundColor: '#253C96',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} style={{ color: '#F59A1E' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                Revisar / Corregir Clasificación IA
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#C4E7E5' }}>
                Retroalimentación al Agente de Clasificación de Reportes
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

        {/* Contenido */}
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

          {/* Comparación de clasificación actual vs nueva */}
          <div
            style={{
              marginBottom: '20px',
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                CATEGORÍA ACTUAL
              </span>
              <strong style={{ fontSize: '14px', color: '#1E293B' }}>
                {reporte.categoria || 'Sin clasificar'}
              </strong>
              {reporte.confianzaIA && (
                <span style={{ fontSize: '11px', color: '#0369A1', display: 'block', marginTop: '2px' }}>
                  {(reporte.confianzaIA * 100).toFixed(0)}% confianza IA
                </span>
              )}
            </div>

            <ArrowRight size={20} style={{ color: '#253C96' }} />

            <div>
              <span style={{ fontSize: '11px', color: '#F36B2E', fontWeight: 600, display: 'block' }}>
                NUEVA CATEGORÍA
              </span>
              <strong style={{ fontSize: '14px', color: '#F36B2E' }}>
                {categoriaSeleccionada}
              </strong>
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
              Selecciona la categoría correcta:
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                maxHeight: '230px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {CATEGORIAS_CATALOGO.map((item) => {
                const isSelected = categoriaSeleccionada === item.categoria;
                return (
                  <div
                    key={item.categoria}
                    onClick={() => setCategoriaSeleccionada(item.categoria)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #253C96' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isSelected ? '#253C96' : '#1E293B',
                        }}
                      >
                        {item.categoria}
                      </span>
                      {isSelected && <Check size={16} style={{ color: '#253C96' }} />}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                      {item.desc}
                    </span>
                  </div>
                );
              })}
            </div>
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
              Motivo o razonamiento de la corrección:
            </label>
            <textarea
              rows={3}
              value={razonamiento}
              onChange={(e) => setRazonamiento(e.target.value)}
              placeholder="Explica brevemente por qué se ajustó la categoría para alimentar el modelo de IA..."
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
              <Check size={16} />
              {submitting ? 'Guardando...' : 'Aplicar Corrección'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
