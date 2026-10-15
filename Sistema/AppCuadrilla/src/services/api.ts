import { Platform } from 'react-native';
import { buildAssignedReportsPath, buildLocationBatch, fieldApiPaths } from './fieldApiContract';
import { resolveApiBaseUrl } from './apiConfiguration';
import { secureStorage } from './secureStorage';
import type { CuadrillaLoginPayload } from './fieldApiContract';
import type { ActualizarEstatusDTO, CuadrillaDTO, EvidenciaDTO, ReporteDTO } from '../types';

const API_BASE_URL = resolveApiBaseUrl(Platform.OS, process.env.EXPO_PUBLIC_API_BASE_URL);

export const getAuthToken = async (): Promise<string | null> => {
  return await secureStorage.getItemAsync('arje_token');
};

export const setAuthToken = async (token: string): Promise<void> => {
  await secureStorage.setItemAsync('arje_token', token);
};

export const clearAuthToken = async (): Promise<void> => {
  await secureStorage.deleteItemAsync('arje_token');
};

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  session?: AuthSessionSnapshot;
}

export interface AuthSessionSnapshot {
  token: string;
  isCurrent(): boolean;
}

async function resolveRequestToken(requiresAuth: boolean, session?: AuthSessionSnapshot): Promise<string | null> {
  if (!session) return requiresAuth ? getAuthToken() : null;

  const currentToken = await getAuthToken();
  if (currentToken !== session.token || !session.isCurrent()) {
    throw new Error('La sesión cambió antes de enviar la operación.');
  }
  return session.token;
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { requiresAuth = true, headers, session, ...fetchOptions } = options;

  const token = await resolveRequestToken(requiresAuth, session);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

export const apiRequestMultipart = async <T>(
  endpoint: string,
  formData: FormData,
  requiresAuth = true,
  session?: AuthSessionSnapshot,
): Promise<T> => {
  const token = await resolveRequestToken(requiresAuth, session);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
};

export const loginCuadrilla = async (usuario: string, password: string) => {
  return apiRequest<CuadrillaLoginPayload>('/cuadrillas/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, password }),
    requiresAuth: false,
  });
};

export const getReportesAsignados = async (idCuadrilla: number) => {
  return apiRequest<ReporteDTO[]>(buildAssignedReportsPath(idCuadrilla));
};

export const getReporteDetalle = async (id: number) => {
  return apiRequest<ReporteDTO>(`/reportes/${id}`);
};

export const actualizarEstatusReporte = async (id: number, data: ActualizarEstatusDTO, session?: AuthSessionSnapshot) => {
  return apiRequest<void>(fieldApiPaths.estatus(id), {
    method: 'PUT',
    body: JSON.stringify(data.estatus),
    session,
  });
};

export const subirEvidencia = async (idReporte: number, formData: FormData, session?: AuthSessionSnapshot) => {
  return apiRequestMultipart<EvidenciaDTO>(fieldApiPaths.evidencias(idReporte), formData, true, session);
};

export const enviarUbicacion = async (data: {
  idReporte: number;
  latitud: number;
  longitud: number;
}, session?: AuthSessionSnapshot) => {
  return enviarUbicaciones(data.idReporte, [data], session);
};

export const enviarUbicaciones = async (
  idReporte: number,
  ubicaciones: { latitud: number; longitud: number }[],
  session?: AuthSessionSnapshot,
) => {
  return apiRequest<void>(fieldApiPaths.ubicaciones(idReporte), {
    method: 'POST',
    body: JSON.stringify(buildLocationBatch(ubicaciones)),
    session,
  });
};

export const updateAvailability = (id: number, estatusDisponibilidad: 1 | 2 | 3, session?: AuthSessionSnapshot) =>
  apiRequest<void>(fieldApiPaths.disponibilidad(id), {
    method: 'PUT',
    body: JSON.stringify({ estatusDisponibilidad }),
    session,
  });

export const getCuadrillaActual = async () => apiRequest<CuadrillaDTO>('/cuadrillas/me');

export const getCuadrillas = async () => {
  return apiRequest<CuadrillaDTO[]>('/cuadrillas');
};
