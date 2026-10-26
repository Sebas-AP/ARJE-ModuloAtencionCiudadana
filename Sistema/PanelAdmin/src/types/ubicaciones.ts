export interface UltimaPosicionCuadrilla {
  idSeguimiento: number;
  idReporte: number;
  folioReporte: string;
  latitud: number;
  longitud: number;
  fechaHora: string;
  fechaRecepcion: string | null;
  precisionMetros: number | null;
}

export interface UltimaUbicacionCuadrilla {
  idCuadrilla: number;
  cuadrillaNombre: string;
  posicion: UltimaPosicionCuadrilla | null;
}

export type UbicacionesConnectionState = 'conectando' | 'conectado' | 'degradado';

export interface CrewMapPosition {
  idCuadrilla: number;
  nombre: string;
  lat: number;
  lng: number;
  idSeguimiento: number;
  idReporte: number;
  folioReporte: string;
  fechaHora: string;
  precisionMetros: number | null;
  reciente: boolean;
}

export interface UbicacionesStoreSnapshot {
  posiciones: UltimaUbicacionCuadrilla[];
  estado: UbicacionesConnectionState;
  error: string | null;
}
