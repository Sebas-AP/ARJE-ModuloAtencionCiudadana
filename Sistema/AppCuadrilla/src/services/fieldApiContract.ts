const ACTIVE_ASSIGNED_STATUSES = new Set([2, 3, 4]);
const VISIBLE_ASSIGNED_STATUSES = new Set([2, 3, 4, 5, 6, 7]);

export interface CuadrillaLoginPayload {
  token: string;
  cuadrilla: {
    id: number;
    nombre: string;
    integrantes?: string;
    usuarioApp: string;
    estatusDisponibilidad: number;
    reportesAsignadosCount: number;
  };
}

export const fieldApiPaths = {
  misReportes: '/cuadrillas/me/reportes',
  estatus: (idReporte: number) => `/reportes/${idReporte}/estatus`,
  evidencias: (idReporte: number) => `/reportes/${idReporte}/evidencias`,
  ubicaciones: (idReporte: number) => `/reportes/${idReporte}/ubicaciones`,
  disponibilidad: (idCuadrilla: number) => `/cuadrillas/${idCuadrilla}/disponibilidad`,
  tiempoEstimado: (idReporte: number) => `/reportes/${idReporte}/tiempo-estimado`,
  comentariosResolucion: (idReporte: number) => `/reportes/${idReporte}/comentarios-resolucion`,
  resultadoSupervision: (idReporte: number) => `/reportes/${idReporte}/supervision/resultado`,
};

export const buildAssignedReportsPath = (idCuadrilla: number) =>
  `/reportes?idCuadrillaAsignada=${idCuadrilla}&registrosPorPagina=100`;

export const buildSupervisedReportsPath = (idCuadrilla: number) =>
  `/reportes?idCuadrillaSupervisora=${idCuadrilla}&registrosPorPagina=100`;

export const isActiveAssignedStatus = (estatus: number) =>
  ACTIVE_ASSIGNED_STATUSES.has(estatus);

export const isVisibleAssignedStatus = (estatus: number) =>
  VISIBLE_ASSIGNED_STATUSES.has(estatus);

export const createCuadrillaSession = (response: CuadrillaLoginPayload) => ({
  token: response.token,
  cuadrilla: response.cuadrilla,
});

export interface MuestraUbicacion {
  latitud: number;
  longitud: number;
  idMuestra?: string;
  fechaCaptura?: string;
  precisionMetros?: number;
}

export const buildLocationBatch = (ubicaciones: MuestraUbicacion[]) => ({
  ubicaciones: ubicaciones.map(({ latitud, longitud, idMuestra, fechaCaptura, precisionMetros }) => ({
    latitud,
    longitud,
    ...(idMuestra !== undefined && { idMuestra }),
    ...(fechaCaptura !== undefined && { fechaCaptura }),
    ...(precisionMetros !== undefined && { precisionMetros }),
  })),
});
