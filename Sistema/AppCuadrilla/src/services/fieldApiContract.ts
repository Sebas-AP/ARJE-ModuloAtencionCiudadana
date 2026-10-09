const ACTIVE_ASSIGNED_STATUSES = new Set([2, 3, 4]);

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
  estatus: (idReporte: number) => `/reportes/${idReporte}/estatus`,
  evidencias: (idReporte: number) => `/reportes/${idReporte}/evidencias`,
  ubicaciones: (idReporte: number) => `/reportes/${idReporte}/ubicaciones`,
};

export const buildAssignedReportsPath = (idCuadrilla: number) =>
  `/reportes?idCuadrillaAsignada=${idCuadrilla}&registrosPorPagina=100`;

export const isActiveAssignedStatus = (estatus: number) =>
  ACTIVE_ASSIGNED_STATUSES.has(estatus);

export const createCuadrillaSession = (response: CuadrillaLoginPayload) => ({
  token: response.token,
  cuadrilla: response.cuadrilla,
});

export const buildLocationBatch = ({ latitud, longitud }: { latitud: number; longitud: number }) => ({
  ubicaciones: [{ latitud, longitud }],
});
