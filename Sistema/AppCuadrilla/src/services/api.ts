import * as SecureStore from 'expo-secure-store';
import { buildAssignedReportsPath, buildLocationBatch, fieldApiPaths } from './fieldApiContract';
import type { CuadrillaLoginPayload } from './fieldApiContract';
import type { ActualizarEstatusDTO, CuadrillaDTO, EvidenciaDTO, ReporteDTO } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:5170/api';

export const getAuthToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('arje_token');
};

export const setAuthToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync('arje_token', token);
};

export const clearAuthToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync('arje_token');
};

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { requiresAuth = true, headers, ...fetchOptions } = options;

  const token = requiresAuth ? await getAuthToken() : null;

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
  requiresAuth = true
): Promise<T> => {
  const token = requiresAuth ? await getAuthToken() : null;

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

export const actualizarEstatusReporte = async (id: number, data: ActualizarEstatusDTO) => {
  return apiRequest<void>(fieldApiPaths.estatus(id), {
    method: 'PUT',
    body: JSON.stringify(data.estatus),
  });
};

export const subirEvidencia = async (idReporte: number, formData: FormData) => {
  return apiRequestMultipart<EvidenciaDTO>(fieldApiPaths.evidencias(idReporte), formData);
};

export const enviarUbicacion = async (data: {
  idReporte: number;
  latitud: number;
  longitud: number;
}) => {
  return enviarUbicaciones(data.idReporte, [data]);
};

export const enviarUbicaciones = async (
  idReporte: number,
  ubicaciones: { latitud: number; longitud: number }[],
) => {
  return apiRequest<void>(fieldApiPaths.ubicaciones(idReporte), {
    method: 'POST',
    body: JSON.stringify(buildLocationBatch(ubicaciones)),
  });
};

export const updateAvailability = (id: number, estatusDisponibilidad: 1 | 2 | 3) =>
  apiRequest<void>(fieldApiPaths.disponibilidad(id), {
    method: 'PUT',
    body: JSON.stringify({ estatusDisponibilidad }),
  });

export const getCuadrillaActual = async () => apiRequest<CuadrillaDTO>('/cuadrillas/me');

export const getCuadrillas = async () => {
  return apiRequest<CuadrillaDTO[]>('/cuadrillas');
};
