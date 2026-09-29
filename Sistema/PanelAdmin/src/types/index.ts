/**
 * Definiciones de Tipos y DTOs para ARJE Administrador
 * Alineados al 100% con los modelos y controladores .NET de Sistema/API
 */

// Enums del sistema
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

export enum EstatusCuadrilla {
  Disponible = 1,
  Ocupada = 2,
  FueraServicio = 3,
}

export enum RolUsuario {
  Administrador = 1,
  Cuadrilla = 2,
}

// DTOs de Usuario y Autenticación
export interface UsuarioDTO {
  id: number;
  nombre: string;
  usuario: string;
  rol: RolUsuario | string;
  activo: boolean;
}

export interface LoginDTO {
  usuario: string;
  password: string;
}

export interface LoginResponseDTO {
  token: string;
  usuario: UsuarioDTO;
}

// DTOs de Evidencia
export interface EvidenciaDTO {
  id: number;
  tipo: TipoEvidencia;
  archivoUrl: string;
  fechaCaptura: string;
}

// DTOs de Seguimiento de Ubicación
export interface SeguimientoUbicacionDTO {
  id: number;
  idCuadrilla: number;
  cuadrillaNombre?: string;
  latitud: number;
  longitud: number;
  fechaRegistro: string;
}

// DTOs de Cuadrilla
export interface CuadrillaDTO {
  id: number;
  nombre: string;
  integrantes?: any; // string o string[]
  usuarioApp: string;
  estatusDisponibilidad: EstatusCuadrilla;
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

export interface CuadrillaCreacionDTO {
  nombre: string;
  integrantes?: string;
  usuarioApp: string;
  password: string;
  estatusDisponibilidad: EstatusCuadrilla;
  telefonoContacto?: string;
  vehiculo?: string;
}

export interface CuadrillaDisponibilidadDTO {
  estatusDisponibilidad: EstatusCuadrilla;
}

// DTOs de Reporte
export interface ReporteDTO {
  id: number;
  folio?: string; // FOL-2023-XX o REP-2026-XX
  tipoProblema: TipoProblema;
  tipoReporte?: string;
  categoria?: string | null; // Categoría producida por el Agente de Clasificación IA
  confianzaIA?: number | null;
  razonamientoIA?: string | null;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  fechaRecibido: string;
  fechaCreacion?: string; // Alias para compatibilidad de vistas
  estatus: EstatusReporte | any;
  tiempoEstimado?: number; // en minutos u horas
  tiempoEstimadoHoras?: number;
  idCuadrillaAsignada?: number | null;
  cuadrillaAsignada?: string | null; // Alias para compatibilidad de vistas
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
  prioridad?: 'Alta' | 'Media' | 'Baja';
}

export interface ReporteDetalleDTO extends ReporteDTO {
  evidencias: EvidenciaDTO[];
  seguimientosUbicacion: SeguimientoUbicacionDTO[];
  comentariosResolucion?: string;
  fechaResolucion?: string;
}

export interface ReporteCreacionDTO {
  tipoProblema: TipoProblema;
  categoria?: string;
  confianzaIA?: number;
  razonamientoIA?: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  numeroContrato?: string;
  nombreCiudadano?: string;
  telefonoCiudadano?: string;
}

export interface ActualizarCategoriaDTO {
  categoria: string;
  tipoProblema?: TipoProblema;
  razonamiento?: string;
}

export interface AsignarCuadrillaDTO {
  idCuadrilla: number;
  tiempoEstimado?: number;
}

export interface ProgramarSupervisionDTO {
  idCuadrillaSupervisora: number;
  fechaSupervision?: string;
  notasSupervision?: string;
}

export interface LandingPageDTO {
  enProceso: ReporteDTO[];
  nuevos: ReporteDTO[];
}

// DTOs de Dashboard e Indicadores
export interface DashboardMetricsDTO {
  reportesTotales: number;
  reportesEnProceso: number;
  reportesPendientes: number;
  reportesResueltos: number;
  deltaHoy: number;
  deltaEnProceso: number;
  deltaPendientes: number;
  deltaResueltos: number;
  totalReportes?: number;
}

export interface GraficaMesDTO {
  mes: string;
  recibidos: number;
  resueltos: number;
}

export interface CategoriaCountDTO {
  categoria: string;
  tipoProblema: TipoProblema;
  total: number;
  porcentaje: number;
}

export interface CuadrillaRendimientoDTO {
  idCuadrilla: number;
  nombre: string;
  reportesAtendidos: number;
  tiempoPromedioMinutos: number;
}
