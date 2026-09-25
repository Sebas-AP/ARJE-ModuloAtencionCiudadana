/**
 * Configuración centralizada de cliente HTTP y Mock Layer
 * 
 * NOTA PARA EL AGENTE DE BACKEND:
 * - Para activar la conexión directa con el servidor .NET (Sistema/API), 
 *   cambia `USE_MOCK_DATA` a `false` o define `VITE_USE_MOCK=false` en el archivo .env.
 * - Asegúrate de que Sistema/API esté corriendo (ej. en http://localhost:5000 o https://localhost:7001).
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK !== 'false';

// Helper para obtener token JWT de localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem('arje_admin_token');
}

// Helper para guardar token JWT
export function setAuthToken(token: string): void {
  localStorage.setItem('arje_admin_token', token);
}

// Helper para remover token JWT
export function removeAuthToken(): void {
  localStorage.removeItem('arje_admin_token');
  localStorage.removeItem('arje_admin_user');
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
