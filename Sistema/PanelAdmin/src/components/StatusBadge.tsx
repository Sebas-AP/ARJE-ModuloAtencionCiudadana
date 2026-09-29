import React from 'react';
import { EstatusReporte, EstatusCuadrilla } from '../types';

interface StatusBadgeProps {
  estatus?: EstatusReporte | string;
  status?: string; // Prop alternativa
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ estatus, status, size = 'md' }) => {
  const rawStatus = (status ?? estatus) as any;

  const getBadgeConfig = () => {
    // Normalizar a string si viene como texto
    const s = String(rawStatus || '').toLowerCase();

    if (rawStatus === EstatusReporte.Nuevo || s.includes('nuevo') || s.includes('pendiente')) {
      return {
        label: 'Pendiente',
        bg: '#FEF2F2',
        color: '#DC2626',
        border: '#FECACA',
        dot: '#EF4444',
      };
    }
    if (rawStatus === EstatusReporte.Asignado || s === 'asignado') {
      return {
        label: 'Asignado',
        bg: '#EFF6FF',
        color: '#1D4ED8',
        border: '#BFDBFE',
        dot: '#3B82F6',
      };
    }
    if (rawStatus === EstatusReporte.LevantandoInformacion || s.includes('camino') || s.includes('evaluando')) {
      return {
        label: 'En camino',
        bg: '#FFFBEB',
        color: '#D97706',
        border: '#FDE68A',
        dot: '#F59E0B',
      };
    }
    if (rawStatus === EstatusReporte.EnProceso || s.includes('proceso') || s.includes('servicio')) {
      return {
        label: s.includes('servicio') ? 'En Servicio' : 'En proceso',
        bg: '#FFF7ED',
        color: '#C2410C',
        border: '#FFEDD5',
        dot: '#F97316',
      };
    }
    if (
      rawStatus === EstatusReporte.Completado ||
      rawStatus === EstatusReporte.Cerrado ||
      s.includes('resuelto') ||
      s.includes('completado') ||
      s.includes('disponible')
    ) {
      return {
        label: s.includes('disponible') ? 'Disponible' : 'Resuelto',
        bg: '#ECFDF5',
        color: '#047857',
        border: '#A7F3D0',
        dot: '#10B981',
      };
    }
    if (rawStatus === EstatusReporte.EnSupervision || s.includes('supervisión') || s.includes('supervision')) {
      return {
        label: 'En supervisión',
        bg: '#F5F3FF',
        color: '#6D28D9',
        border: '#DDD6FE',
        dot: '#8B5CF6',
      };
    }
    if (s.includes('cancelado') || s.includes('inactiva') || s.includes('inactivo')) {
      return {
        label: s.includes('inactiv') ? 'Inactiva' : 'Cancelado',
        bg: '#F1F5F9',
        color: '#475569',
        border: '#CBD5E1',
        dot: '#94A3B8',
      };
    }

    return {
      label: String(rawStatus || 'Desconocido'),
      bg: '#F8FAFC',
      color: '#64748B',
      border: '#E2E8F0',
      dot: '#94A3B8',
    };
  };

  const config = getBadgeConfig();
  const fontSizes = { sm: '11px', md: '12.5px', lg: '14px' };
  const paddings = { sm: '2px 8px', md: '4px 10px', lg: '6px 14px' };
  const dotSizes = { sm: '6px', md: '7px', lg: '8px' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        borderRadius: '9999px',
        padding: paddings[size],
        fontSize: fontSizes[size],
        fontWeight: 600,
        letterSpacing: '0.01em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: dotSizes[size],
          height: dotSizes[size],
          borderRadius: '50%',
          backgroundColor: config.dot,
        }}
      />
      {config.label}
    </span>
  );
};

export const CuadrillaStatusBadge: React.FC<{ estatus: EstatusCuadrilla }> = ({ estatus }) => {
  const isDisponible = estatus === EstatusCuadrilla.Disponible;
  const isOcupada = estatus === EstatusCuadrilla.Ocupada;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: isDisponible ? '#ECFDF5' : isOcupada ? '#FFF7ED' : '#FEF2F2',
        color: isDisponible ? '#065F46' : isOcupada ? '#9A3412' : '#991B1B',
        border: `1px solid ${isDisponible ? '#A7F3D0' : isOcupada ? '#FED7AA' : '#FECACA'}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isDisponible ? '#10B981' : isOcupada ? '#F97316' : '#EF4444',
        }}
      />
      {isDisponible ? 'Disponible' : isOcupada ? 'En servicio' : 'Fuera de servicio'}
    </span>
  );
};
