import React, { useState } from 'react';
import { PrioridadReporte, NivelPrioridad } from '../types';
import { AlertTriangle, AlertOctagon, Flame, ShieldAlert, Sparkles, Info } from 'lucide-react';

interface PrioridadBadgeProps {
  prioridad?: NivelPrioridad | PrioridadReporte | string | number | null;
  scorePrioridad?: number | null;
  justificacionPrioridad?: string | null;
  justificacion?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showTooltip?: boolean;
}

export const PrioridadBadge: React.FC<PrioridadBadgeProps> = ({
  prioridad,
  scorePrioridad,
  justificacionPrioridad,
  justificacion,
  size = 'md',
  showScore = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const justText = justificacionPrioridad || justificacion;

  // Normalizar prioridad
  const getNormalized = (): { nivel: NivelPrioridad; label: string } => {
    if (prioridad === PrioridadReporte.Critica || prioridad === 4) return { nivel: 'Critica', label: 'Crítica' };
    if (prioridad === PrioridadReporte.Alta || prioridad === 3) return { nivel: 'Alta', label: 'Alta' };
    if (prioridad === PrioridadReporte.Media || prioridad === 2) return { nivel: 'Media', label: 'Media' };
    if (prioridad === PrioridadReporte.Baja || prioridad === 1) return { nivel: 'Baja', label: 'Baja' };

    const s = String(prioridad || '').toLowerCase();
    if (s.includes('crit') || s.includes('crít')) return { nivel: 'Critica', label: 'Crítica' };
    if (s.includes('alt')) return { nivel: 'Alta', label: 'Alta' };
    if (s.includes('baj')) return { nivel: 'Baja', label: 'Baja' };
    return { nivel: 'Media', label: 'Media' };
  };

  const { nivel, label } = getNormalized();

  const getConfig = () => {
    switch (nivel) {
      case 'Critica':
        return {
          bg: '#FEF2F2',
          color: '#991B1B',
          border: '#FCA5A5',
          dot: '#EF4444',
          pulse: true,
          icon: <Flame size={size === 'sm' ? 12 : 14} color="#DC2626" />,
        };
      case 'Alta':
        return {
          bg: '#FFF7ED',
          color: '#C2410C',
          border: '#FDBA74',
          dot: '#F97316',
          pulse: false,
          icon: <AlertTriangle size={size === 'sm' ? 12 : 14} color="#EA580C" />,
        };
      case 'Media':
        return {
          bg: '#FFFBEB',
          color: '#B45309',
          border: '#FDE68A',
          dot: '#F59E0B',
          pulse: false,
          icon: <ShieldAlert size={size === 'sm' ? 12 : 14} color="#D97706" />,
        };
      case 'Baja':
        return {
          bg: '#F0FDF4',
          color: '#15803D',
          border: '#BBF7D0',
          dot: '#22C55E',
          pulse: false,
          icon: <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E' }} />,
        };
    }
  };

  const config = getConfig();

  const sizeStyles = {
    sm: { padding: '2px 7px', fontSize: '11px', gap: '4px' },
    md: { padding: '4px 10px', fontSize: '12.5px', gap: '6px' },
    lg: { padding: '6px 14px', fontSize: '14px', gap: '8px' },
  }[size];

  const scorePct = scorePrioridad != null ? Math.round(scorePrioridad * 100) : null;

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 700,
          borderRadius: '9999px',
          border: `1px solid ${config.border}`,
          backgroundColor: config.bg,
          color: config.color,
          boxShadow: config.pulse ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
          cursor: justText ? 'help' : 'default',
          transition: 'all 0.15s ease',
          ...sizeStyles,
        }}
      >
        {config.icon}
        <span>{label}</span>
        {showScore && scorePct != null && (
          <span
            style={{
              fontSize: '10.5px',
              opacity: 0.85,
              fontWeight: 800,
              backgroundColor: 'rgba(0,0,0,0.06)',
              padding: '1px 5px',
              borderRadius: '6px',
            }}
          >
            {scorePct}%
          </span>
        )}
      </span>

      {/* Tooltip con justificación y detalles del Agente IA */}
      {hovered && (justText || scorePct != null) && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1E293B',
            color: '#F8FAFC',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11.5px',
            lineHeight: 1.4,
            width: 'max-content',
            maxWidth: '260px',
            zIndex: 9999,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            pointerEvents: 'none',
            fontFamily: "var(--font-family-base, 'Inria Sans', sans-serif)",
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: '#38BDF8',
              fontWeight: 700,
              marginBottom: '3px',
              fontSize: '11px',
            }}
          >
            <Sparkles size={12} color="#38BDF8" />
            <span>Dictamen de Prioridad IA</span>
            {scorePct != null && (
              <span style={{ color: '#F1F5F9', marginLeft: 'auto' }}>
                Score: {scorePct}%
              </span>
            )}
          </div>
          <div style={{ color: '#CBD5E1' }}>
            {justText || `Prioridad ${label} evaluada automáticamente según severidad e impacto.`}
          </div>
          {/* Flecha del tooltip */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '5px',
              borderStyle: 'solid',
              borderColor: '#1E293B transparent transparent transparent',
            }}
          />
        </div>
      )}
    </div>
  );
};
