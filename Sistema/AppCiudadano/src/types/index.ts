export enum TipoProblema {
  Fuga = 1,
  FaltaAbastecimiento = 2,
  InstalacionRota = 3,
  UsoIndebido = 4,
  Otro = 5,
}

export enum EstatusReporte {
  Nuevo = 1,
  Asignado = 2,
  LevantandoInformacion = 3,
  EnProceso = 4,
  Completado = 5,
  EnSupervision = 6,
  Cerrado = 7,
}

export enum TipoEvidencia {
  Inicial = 1,
  Resolucion = 2,
}

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface ReporteCreacionDTO {
  tipoProblema: TipoProblema;
  descripcion: string;
  latitud: number;
  longitud: number;
  numeroContrato?: string;
  nombreCiudadano?: string;
  telefonoCiudadano?: string;
}

export interface EvidenciaCreacionDTO {
  tipo: TipoEvidencia;
  archivo: any; // FormData file
}

export interface EvidenciaDTO {
  id: number;
  idReporte: number;
  tipo: TipoEvidencia;
  archivo: string;
  archivoUrl: string;
  fechaCaptura: string;
}

export interface SeguimientoUbicacionDTO {
  id: number;
  idReporte: number;
  idCuadrilla: number;
  latitud: number;
  longitud: number;
  fecha: string;
  cuadrilla?: {
    id: number;
    nombre: string;
  };
}

export interface CuadrillaDTO {
  id: number;
  nombre: string;
  estatusDisponibilidad: number;
}

export interface ReporteDTO {
  id: number;
  tipoProblema: TipoProblema;
  descripcion: string;
  latitud: number;
  longitud: number;
  fechaRecibido: string;
  estatus: EstatusReporte;
  tiempoEstimado?: number;
  idCuadrillaAsignada?: number;
  cuadrillaAsignada?: CuadrillaDTO;
  idCuadrillaSupervisora?: number;
  cuadrillaSupervisora?: CuadrillaDTO;
  numeroContrato?: string;
  nombreCiudadano?: string;
  telefonoCiudadano?: string;
  evidencias: EvidenciaDTO[];
}

export interface ReporteDetalleDTO extends ReporteDTO {
  seguimientosUbicacion: SeguimientoUbicacionDTO[];
}

export interface LandingPageDTO {
  enProceso: ReporteDTO[];
  nuevos: ReporteDTO[];
}

export interface PaginatedResponse<T> {
  data: T[];
  totalRegistros: number;
  pagina: number;
  registrosPorPagina: number;
  totalPaginas: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export interface ClassificationResult {
  tipoProblema: TipoProblema;
  confidence: number;
  reasoning: string;
}

export interface OfflineReport {
  id: string;
  data: ReporteCreacionDTO;
  evidencias: { uri: string; tipo: TipoEvidencia }[];
  timestamp: number;
  retries: number;
}

export interface UserProfile {
  nombreCiudadano?: string;
  telefonoCiudadano?: string;
  numeroContrato?: string;
}

export interface NotificationData {
  type: 'status_change' | 'assigned' | 'completed' | 'new_report';
  reporteId: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}