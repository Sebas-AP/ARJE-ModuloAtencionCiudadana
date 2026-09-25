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
  rol: RolUsuario;
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
  integrantes?: string;
  usuarioApp: string;
  estatusDisponibilidad: EstatusCuadrilla;
  reportesActivosCount?: number;
  telefonoContacto?: string;
  vehiculo?: string;
}

export interface CuadrillaCreacionDTO {
  nombre: string;
  integrantes?: string;
  usuarioApp: string;
  password: string;
  estatusDisponibilidad: EstatusCuadrilla;
}

export interface CuadrillaDisponibilidadDTO {
  estatusDisponibilidad: EstatusCuadrilla;
}

// DTOs de Reporte
export interface ReporteDTO {
  id: number;
  folio?: string; // FOL-2023-XX
  tipoProblema: TipoProblema;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  fechaRecibido: string;
  estatus: EstatusReporte;
  tiempoEstimado?: number; // en minutos u horas
  idCuadrillaAsignada?: number | null;
  cuadrillaAsignadaNombre?: string | null;
  numeroContrato?: string | null;
  nombreCiudadano?: string | null;
  totalEvidencias: number;
  prioridad?: 'Alta' | 'Media' | 'Baja';
}

export interface ReporteDetalleDTO extends ReporteDTO {
  telefonoCiudadano?: string | null;
  idCuadrillaSupervisora?: number | null;
  cuadrillaSupervisoraNombre?: string | null;
  evidencias: EvidenciaDTO[];
  seguimientosUbicacion: SeguimientoUbicacionDTO[];
  comentariosResolucion?: string;
  fechaResolucion?: string;
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
