import { useEffect, useSyncExternalStore } from 'react';
import { createUbicacionesStore } from '../services/ubicacionesStore';
import { ubicacionesRealtime } from '../services/ubicacionesRealtime';
import { cuadrillasService } from '../services/cuadrillasService';
import { getAuthToken, removeAuthToken } from '../services/api';
import type { UbicacionesStoreSnapshot } from '../types/ubicaciones';

function notifyUnauthorized(): void {
  // apiClient ya removió el token y notificó; evitar un segundo aviso global.
  if (getAuthToken() === null) return;
  removeAuthToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arje:unauthorized'));
  }
}

export const ubicacionesStore = createUbicacionesStore({
  realtime: ubicacionesRealtime,
  fetchSnapshot: (signal) => cuadrillasService.getUltimasUbicaciones(signal),
  onUnauthorized: notifyUnauthorized,
});

export function useUbicacionesCuadrillas(enabled: boolean): UbicacionesStoreSnapshot {
  const snapshot = useSyncExternalStore(
    ubicacionesStore.subscribe,
    ubicacionesStore.getSnapshot,
    ubicacionesStore.getSnapshot,
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const updateVisibility = () => {
      ubicacionesStore.setVisible(
        typeof document === 'undefined' || document.visibilityState !== 'hidden',
      );
    };

    ubicacionesStore.acquire();
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);

    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      ubicacionesStore.release();
    };
  }, [enabled]);

  return snapshot;
}
