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
  tiempoEstimadoUnidad?: number | null;
  motivoEnProceso?: number | null;
  motivoEnProcesoDetalle?: string | null;
  motivoResolucion?: number | null;
  idCuadrillaAsignada?: number | null;
  cuadrillaAsignada?: string | null;
  cuadrillaAsignadaNombre?: string | null;
  idCuadrillaSupervisora?: number | null;
  cuadrillaSupervisora?: string | null;
  cuadrillaSupervisoraNombre?: string | null;
  fechaSupervision?: string;
  observacionesSupervision?: string;
  notasSupervision?: string;
  comentariosResolucion?: string;
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

export interface CuadrillaLoginResponseDTO {
  token: string;
  cuadrilla: CuadrillaDTO;
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

export const UnidadTiempoEstimadoLabels: Record<number, string> = {
  1: 'Horas',
  2: 'Días',
};

export const MotivoEnProcesoLabels: Record<number, string> = {
  1: 'Llegando al lugar',
  2: 'Levantando información',
  3: 'Pidiendo herramientas y materiales',
  4: 'Comenzando con la reparación',
  5: 'Otro',
};

export const MotivoResolucionLabels: Record<number, string> = {
  1: 'Fuga reparada',
  2: 'Suministro restablecido',
  3: 'Falla solucionada',
  4: 'Calidad del agua mejorada',
  5: 'Uso indebido corregido',
  6: 'Otro',
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
  motivoEnProceso?: number;
  motivoEnProcesoDetalle?: string;
  motivoResolucion?: number;
  comentariosResolucion?: string;
}

export interface ActualizarTiempoEstimadoDTO {
  tiempoEstimado: number;
  unidad: number;
}

export interface ActualizarComentariosResolucionDTO {
  motivo: number;
  comentariosResolucion?: string;
}

export interface ActualizarMotivoEnProcesoDTO {
  motivo: number;
  detalle?: string;
}

export interface ResolverSupervisionDTO {
  confirmaReparacion: boolean;
  observaciones?: string;
}
