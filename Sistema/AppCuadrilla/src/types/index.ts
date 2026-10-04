export interface UsuarioDTO {
  id: number;
  nombre: string;
  usuario: string;
  rol: 'Administrador' | 'Cuadrilla';
  activo: boolean;
  correo?: string;
  idCuadrilla?: number;
  cuadrillaNombre?: string;
}

export interface LoginResponseDTO {
  token: string;
  usuario: UsuarioDTO;
}

export interface EvidenciaDTO {
  id: number;
  tipo: 1 | 2; // 1 = Inicial, 2 = Resolucion
  archivoUrl: string;
  fechaCaptura: string;
}

export interface SeguimientoUbicacionDTO {
  id: number;
  idCuadrilla: number;
  cuadrillaNombre?: string;
  latitud: number;
  longitud: number;
  fechaRegistro: string;
}

export interface ReporteDTO {
  id: number;
  folio?: string;
  tipoProblema: number;
  tipoReporte?: string;
  categoria?: string | null;
  confianzaIA?: number | null;
  razonamientoIA?: string | null;
  prioridad?: string;
  scorePrioridad?: number | null;
  justificacionPrioridad?: string | null;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  fechaRecibido: string;
  fechaCreacion?: string;
  estatus: number;
  tiempoEstimado?: number;
  tiempoEstimadoHoras?: number;
  idCuadrillaAsignada?: number | null;
  cuadrillaAsignada?: string | null;
  cuadrillaAsignadaNombre?: string | null;
  idCuadrillaSupervisora?: number | null;
  cuadrillaSupervisora?: string | null;
  cuadrillaSupervisoraNombre?: string | null;
  fechaSupervision?: string;
  observacionesSupervision?: string;
  notasSupervision?: string;
  numeroContrato?: string | null;
  nombreCiudadano?: string | null;
  telefonoCiudadano?: string | null;
  correoCiudadano?: string | null;
  totalEvidencias: number;
  evidencias?: EvidenciaDTO[];
  seguimientosUbicacion?: SeguimientoUbicacionDTO[];
}

export interface CuadrillaDTO {
  id: number;
  nombre: string;
  integrantes?: string;
  usuarioApp: string;
  estatusDisponibilidad: number;
  reportesActivosCount?: number;
  telefonoContacto?: string;
  telefono?: string;
  vehiculo?: string;
  placas?: string;
  zona?: string;
  lider?: string;
  activo?: boolean;
  disponible?: boolean;
  especialidades?: string[];
}

export type EstatusReporte =
  | 'Nuevo'
  | 'Asignado'
  | 'LevantandoInformacion'
  | 'EnProceso'
  | 'Completado'
  | 'EnSupervision'
  | 'Cerrado';

export const EstatusReporteLabels: Record<number, string> = {
  1: 'Nuevo',
  2: 'Asignado',
  3: 'Levantando información',
  4: 'En proceso',
  5: 'Completado',
  6: 'En supervisión',
  7: 'Cerrado',
};

export const EstatusReporteColors: Record<number, string> = {
  1: '#64748B',
  2: '#0057D9',
  3: '#F36B2E',
  4: '#253C96',
  5: '#22C55E',
  6: '#F59A1E',
  7: '#94A3B8',
};

export type PrioridadReporte = 'Critica' | 'Alta' | 'Media' | 'Baja';

export const PrioridadColors: Record<PrioridadReporte, string> = {
  Critica: '#EF4444',
  Alta: '#F97316',
  Media: '#F59A1E',
  Baja: '#22C55E',
};

export interface AsignarCuadrillaDTO {
  idCuadrilla: number;
  tiempoEstimado?: number;
}

export interface ActualizarEstatusDTO {
  estatus: number;
  tiempoEstimado?: number;
  idCuadrillaAsignada?: number;
  comentariosResolucion?: string;
}