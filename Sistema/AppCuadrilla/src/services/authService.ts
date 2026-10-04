import { login, getAuthToken, setAuthToken, clearAuthToken } from './api';
import { UsuarioDTO, LoginResponseDTO } from '../types';

let currentUser: UsuarioDTO | null = null;

export const authService = {
  async login(usuario: string, password: string): Promise<LoginResponseDTO> {
    const response = await login(usuario, password);
    await setAuthToken(response.token);
    currentUser = response.usuario;
    return response;
  },

  async logout(): Promise<void> {
    await clearAuthToken();
    currentUser = null;
  },

  async getCurrentUser(): Promise<UsuarioDTO | null> {
    if (currentUser) return currentUser;

    const token = await getAuthToken();
    if (!token) return null;

    try {
      const { apiRequest } = await import('./api');
      const user = await apiRequest<UsuarioDTO>('/usuarios/me');
      currentUser = user;
      return user;
    } catch {
      return null;
    }
  },

  getCurrentUserSync(): UsuarioDTO | null {
    return currentUser;
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await getAuthToken();
    return !!token;
  },

  setCurrentUser(user: UsuarioDTO | null) {
    currentUser = user;
  },
};

export { currentUser as currentUserRef };