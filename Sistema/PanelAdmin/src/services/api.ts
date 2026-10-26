import { resolveMockMode } from './mockMode.ts';

/**
 * Configuración centralizada de cliente HTTP y Mock Layer
 * 
 * NOTA PARA EL AGENTE DE BACKEND:
 * - Para activar la conexión directa con el servidor .NET (Sistema/API), 
 *   cambia `USE_MOCK_DATA` a `false` o define `VITE_USE_MOCK=false` en el archivo .env.
 * - Asegúrate de que Sistema/API esté corriendo (ej. en http://localhost:5000 o https://localhost:7001).
 */

const browserStorage = typeof localStorage === 'undefined' ? null : localStorage;
const viteEnv = import.meta.env ?? {};

export const API_BASE_URL = viteEnv.VITE_API_BASE_URL || 'http://localhost:5170/api';
export let USE_MOCK_DATA = resolveMockMode(
  viteEnv.VITE_USE_MOCK,
  browserStorage?.getItem('arje_use_mock') ?? null,
);

export function setUseMockData(useMock: boolean): void {
  void useMock;
  USE_MOCK_DATA = false;
  browserStorage?.removeItem('arje_use_mock');
}

export function toggleMockData(): boolean {
  setUseMockData(false);
  return false;
}

// Helper para obtener token JWT de localStorage
export function getAuthToken(): string | null {
  return browserStorage?.getItem('arje_admin_token') ?? null;
}

// Helper para guardar token JWT
export function setAuthToken(token: string): void {
  browserStorage?.setItem('arje_admin_token', token);
}

// Helper para remover token JWT
export function removeAuthToken(): void {
  browserStorage?.removeItem('arje_admin_token');
  browserStorage?.removeItem('arje_admin_user');
}

// Cliente HTTP genérico para conectar con los endpoints de ASP.NET Core
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      removeAuthToken();
      window.dispatchEvent(new CustomEvent('arje:unauthorized'));
      throw new Error('Sesión expirada o no autorizada');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.mensaje || `Error en petición: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

export function parsePaginationTotal(headers: Headers): number {
  const raw = headers.get('x-total-count') ?? headers.get('cantidadTotalRegistros');
  if (raw === null || raw.trim() === '') {
    throw new Error('La API no informó el total de registros; no se puede paginar el mapa.');
  }
  const total = Number(raw);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error('La API devolvió un total de registros inválido.');
  }
  return total;
}

// Cliente HTTP que devuelve respuesta completa con headers para paginación
export async function apiClientWithHeaders<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; total: number }> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      removeAuthToken();
      window.dispatchEvent(new CustomEvent('arje:unauthorized'));
      throw new Error('Sesión expirada o no autorizada');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.mensaje || `Error en petición: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    if (response.status === 204) {
      return { data: null as T, total: 0 };
    }

    const data = (await response.json()) as T;
    return { data, total: parsePaginationTotal(response.headers) };
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}
