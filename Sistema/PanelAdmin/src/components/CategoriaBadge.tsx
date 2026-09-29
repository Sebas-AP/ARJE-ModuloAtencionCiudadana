import React from 'react';
import { Droplet, AlertTriangle, Wrench, ShieldAlert, HelpCircle, Sparkles } from 'lucide-react';
import { TipoProblema } from '../types';

interface CategoriaBadgeProps {
  categoria?: string | null;
  tipoProblema?: TipoProblema;
  confianzaIA?: number | null;
  razonamientoIA?: string | null;
  showAiIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CategoriaBadge: React.FC<CategoriaBadgeProps> = ({
  categoria,
  tipoProblema,
  confianzaIA,
  showAiIcon = true,
  size = 'md',
}) => {
  const displayCategory = categoria || (tipoProblema ? TipoProblema[tipoProblema] : 'Sin clasificar');

  // Determinar color e ícono según la categoría clasificada
  const getCategoryTheme = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('fuga')) {
      return {
        bg: '#E0F2FE',
        color: '#0369A1',
        border: '#BAE6FD',
        icon: Droplet,
      };
    }
    if (c.includes('presion') || c.includes('abastecimiento') || c.includes('suministro')) {
      return {
        bg: '#FEF3C7',
        color: '#B45309',
        border: '#FDE68A',
        icon: AlertTriangle,
      };
    }
    if (c.includes('medidor') || c.includes('instalacion') || c.includes('registro')) {
      return {
        bg: '#F3E8FF',
        color: '#7E22CE',
        border: '#E9D5FF',
        icon: Wrench,
      };
    }
    if (c.includes('indebido') || c.includes('desperdicio')) {
      return {
        bg: '#FEE2E2',
        color: '#B91C1C',
        border: '#FECACA',
        icon: ShieldAlert,
      };
    }
    return {
      bg: '#F1F5F9',
      color: '#475569',
      border: '#CBD5E1',
      icon: HelpCircle,
    };
  };

  const theme = getCategoryTheme(displayCategory);
  const IconComponent = theme.icon;

  const fontSizes = { sm: '11px', md: '12px', lg: '13.5px' };
  const iconSizes = { sm: 12, md: 14, lg: 16 };
  const paddings = { sm: '2px 7px', md: '3px 9px', lg: '5px 12px' };

  return (
    <span
      title={
        confianzaIA
          ? `Categoría sugerida por IA: ${displayCategory} (${(confianzaIA * 100).toFixed(0)}% confianza)`
          : `Categoría: ${displayCategory}`
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: theme.bg,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        borderRadius: '6px',
        padding: paddings[size],
        fontSize: fontSizes[size],
        fontWeight: 600,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <IconComponent size={iconSizes[size]} style={{ flexShrink: 0 }} />
      <span>{displayCategory}</span>

      {showAiIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            marginLeft: '2px',
            padding: '1px 4px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255,255,255,0.7)',
            fontSize: '9.5px',
            fontWeight: 700,
            color: '#253C96',
            letterSpacing: '0.02em',
          }}
          title="Clasificado por Agente de Inteligencia Artificial"
        >
          <Sparkles size={10} style={{ color: '#F59A1E' }} />
          IA
          {confianzaIA && (
            <span style={{ opacity: 0.85 }}>
              {(confianzaIA * 100).toFixed(0)}%
            </span>
          )}
        </span>
      )}
    </span>
  );
};
