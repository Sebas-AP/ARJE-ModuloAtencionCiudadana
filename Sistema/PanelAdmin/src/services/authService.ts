import { apiClient, USE_MOCK_DATA, setAuthToken, removeAuthToken } from './api';
import { LoginDTO, LoginResponseDTO, UsuarioDTO } from '../types';
import { MOCK_ADMIN_USER } from './mockData';

export const authService = {
  /**
   * Iniciar sesión en el sistema ARJE
   * Endpoint .NET: POST /api/usuarios/login
   */
  async login(credentials: LoginDTO): Promise<LoginResponseDTO> {
    if (USE_MOCK_DATA) {
      // Simular latencia de red
      await new Promise((res) => setTimeout(res, 400));

      if (
        (credentials.usuario === 'admin' && credentials.password === 'admin') ||
        credentials.usuario.length > 0
      ) {
        const response: LoginResponseDTO = {
          token: `mock-jwt-token-admin-${Date.now()}`,
          usuario: {
            ...MOCK_ADMIN_USER,
            usuario: credentials.usuario || 'admin',
          },
        };
        setAuthToken(response.token);
        localStorage.setItem('arje_admin_user', JSON.stringify(response.usuario));
        return response;
      }

      throw new Error('Credenciales incorrectas');
    }

    // Llamada real al backend ASP.NET Core
    const response = await apiClient<LoginResponseDTO>('/usuarios/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response?.token) {
      setAuthToken(response.token);
      localStorage.setItem('arje_admin_user', JSON.stringify(response.usuario));
    }

    return response;
  },

  /**
   * Cerrar sesión
   */
  logout(): void {
    removeAuthToken();
  },

  /**
   * Obtener usuario actual almacenado en sesión
   */
  getCurrentUser(): UsuarioDTO | null {
    const raw = localStorage.getItem('arje_admin_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
