import type { ComponentType } from 'react';
import type { Coordenadas } from '../types';

export interface ReporteLocationMapProps {
  coordinate: Coordenadas | null;
  editable: boolean;
  onCoordinateChange?: (coordinate: Coordenadas) => void;
}

declare const ReporteLocationMap: ComponentType<ReporteLocationMapProps>;
export default ReporteLocationMap;
