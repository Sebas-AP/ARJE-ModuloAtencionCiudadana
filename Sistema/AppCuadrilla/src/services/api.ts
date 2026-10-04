import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

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

export const login = async (usuario: string, password: string) => {
  return apiRequest<{ token: string; usuario: any }>('/usuarios/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, password }),
    requiresAuth: false,
  });
};

export const getReportesAsignados = async (idCuadrilla: number) => {
  return apiRequest<any[]>(`/reportes?idCuadrillaAsignada=${idCuadrilla}&estatus=2`);
};

export const getReporteDetalle = async (id: number) => {
  return apiRequest<any>(`/reportes/${id}`);
};

export const actualizarEstatusReporte = async (id: number, data: any) => {
  return apiRequest<any>(`/reportes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const subirEvidencia = async (formData: FormData) => {
  return apiRequestMultipart<any>('/evidencias', formData);
};

export const enviarUbicacion = async (data: {
  idReporte: number;
  latitud: number;
  longitud: number;
}) => {
  return apiRequest<any>('/seguimientos-ubicacion', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getCuadrillas = async () => {
  return apiRequest<any[]>('/cuadrillas');
};