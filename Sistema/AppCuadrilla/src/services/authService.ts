import { clearAuthToken, getAuthToken, getCuadrillaActual, loginCuadrilla, setAuthToken } from './api';
import { CuadrillaDTO, CuadrillaLoginResponseDTO } from '../types';
import { createCuadrillaSession } from './fieldApiContract';
import { setFieldOperationOwner, syncFieldOperations } from './fieldOperationsService';
import { clearLocationSession, setLocationSessionOwner, stopLocationTracking } from './locationService';

let currentCuadrilla: CuadrillaDTO | null = null;

async function syncAfterSession(): Promise<void> {
  try {
    await syncFieldOperations();
  } catch (error) {
    console.warn('No se pudo sincronizar la cola de operaciones:', error);
  }
}

export const authService = {
  async login(usuario: string, password: string): Promise<CuadrillaLoginResponseDTO> {
    await clearLocationSession();
    setFieldOperationOwner(null);
    const response = createCuadrillaSession(await loginCuadrilla(usuario, password));
    await setAuthToken(response.token);
    currentCuadrilla = response.cuadrilla;
    setFieldOperationOwner(response.cuadrilla.id);
    await setLocationSessionOwner(response.cuadrilla.id);
    await syncAfterSession();
    return response;
  },

  async logout(): Promise<void> {
    await clearLocationSession();
    setFieldOperationOwner(null);
    await clearAuthToken();
    currentCuadrilla = null;
  },

  async getCurrentCuadrilla(): Promise<CuadrillaDTO | null> {
    if (currentCuadrilla) return currentCuadrilla;

    const token = await getAuthToken();
    if (!token) return null;

    try {
      const cuadrilla = await getCuadrillaActual();
      currentCuadrilla = cuadrilla;
      setFieldOperationOwner(cuadrilla.id);
      await setLocationSessionOwner(cuadrilla.id);
      await syncAfterSession();
      return cuadrilla;
    } catch {
      return null;
    }
  },

  getCurrentCuadrillaSync(): CuadrillaDTO | null {
    return currentCuadrilla;
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await getAuthToken();
    return !!token;
  },

  setCurrentCuadrilla(cuadrilla: CuadrillaDTO | null) {
    const changedSession = currentCuadrilla?.id !== cuadrilla?.id;
    currentCuadrilla = cuadrilla;
    setFieldOperationOwner(cuadrilla?.id ?? null);
    void setLocationSessionOwner(cuadrilla?.id ?? null);
    if (changedSession) {
      void stopLocationTracking();
    }
  },
};

export { currentCuadrilla as currentCuadrillaRef };
