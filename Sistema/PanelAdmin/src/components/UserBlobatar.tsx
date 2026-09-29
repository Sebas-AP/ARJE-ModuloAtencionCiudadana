import React from 'react';
import { Blobatar } from '@blobatar/react';
import 'blobatar/motion.css';

interface UserBlobatarProps {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showBorder?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
}

/**
 * Componente de Avatar oficial basado en la librería Blobatar (https://blobatar.dev/?shape=droplet).
 * Utiliza de manera determinística la silueta "droplet" (gota de agua), ideal para el sistema ARJE Agua Potable,
 * con micro-animaciones interactivas de respiración y parpadeo al pasar el cursor (hover).
 */
export const UserBlobatar: React.FC<UserBlobatarProps> = ({
  name = 'Administrador',
  size = 38,
  className = '',
  style,
  showBorder = true,
  isOnline,
  onClick,
}) => {
  // En blobatar, el rango para la forma 'droplet' es [0.86, 0.915], 0.89 garantiza la forma de gota de agua
  const dropletTraits = {
    shape: 0.89,
  };

  return (
    <div
      className={`user-blobatar-container ${className}`}
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF6FF',
        border: showBorder ? '2px solid #C4E7E5' : 'none',
        boxShadow: showBorder ? '0 2px 6px rgba(37, 60, 150, 0.12)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
        ...style,
      }}
      title={`Perfil: ${name}`}
    >
      <Blobatar
        name={name}
        traits={dropletTraits}
        animate="hover"
        size={Math.round(size * 0.92)}
      />

      {isOnline !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: `${Math.max(7, Math.round(size * 0.22))}px`,
            height: `${Math.max(7, Math.round(size * 0.22))}px`,
            borderRadius: '50%',
            backgroundColor: isOnline ? '#22C55E' : '#94A3B8',
            border: '2px solid #FFFFFF',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        />
      )}
    </div>
  );
};
