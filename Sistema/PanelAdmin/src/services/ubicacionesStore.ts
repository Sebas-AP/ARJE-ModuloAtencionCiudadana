import type {
  UbicacionesConnectionState,
  UbicacionesStoreSnapshot,
  UltimaUbicacionCuadrilla,
} from '../types/ubicaciones';
import { mergeSnapshot, mergeUbicacion } from './ubicacionesModel.ts';
import type { UbicacionesRealtime } from './ubicacionesRealtime';

export const SNAPSHOT_INTERVAL_MS = 30_000;
export const AGE_RECALC_INTERVAL_MS = 15_000;
export const RECONNECT_DELAYS_MS = [0, 2_000, 10_000, 30_000] as const;

export interface UbicacionesStoreDependencies {
  realtime: Pick<UbicacionesRealtime, 'start' | 'stop'>;
  fetchSnapshot: (signal?: AbortSignal) => Promise<UltimaUbicacionCuadrilla[]>;
  now?: () => number;
  setTimeout?: (handler: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout?: (handle: ReturnType<typeof setTimeout>) => void;
  setInterval?: (handler: () => void, delay: number) => ReturnType<typeof setInterval>;
  clearInterval?: (handle: ReturnType<typeof setInterval>) => void;
  onUnauthorized?: () => void;
}

function isUnauthorized(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 401) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\b401\b|unauthorized|unauthoriz|no autorizada|sesión expiró/i.test(message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudieron actualizar las ubicaciones.';
}

export function createUbicacionesStore(dependencies: UbicacionesStoreDependencies) {
  const scheduleTimeout = dependencies.setTimeout ?? setTimeout;
  const cancelTimeout = dependencies.clearTimeout ?? clearTimeout;
  const scheduleInterval = dependencies.setInterval ?? setInterval;
  const cancelInterval = dependencies.clearInterval ?? clearInterval;

  let snapshot: UbicacionesStoreSnapshot = { posiciones: [], estado: 'conectando', error: null };
  const listeners = new Set<() => void>();
  let consumers = 0;
  let visible = true;
  let starting = false;
  let active = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryAttempt = 0;
  let reconcileTimer: ReturnType<typeof setInterval> | null = null;
  let ageTimer: ReturnType<typeof setInterval> | null = null;
  let snapshotController: AbortController | null = null;

  function emit(next: UbicacionesStoreSnapshot): void {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function updateState(estado: UbicacionesConnectionState, error: string | null): void {
    emit({ ...snapshot, estado, error });
  }

  function clearTimers(): void {
    if (reconcileTimer) cancelInterval(reconcileTimer);
    if (ageTimer) cancelInterval(ageTimer);
    reconcileTimer = null;
    ageTimer = null;
  }

  function clearRetry(): void {
    if (retryTimer) cancelTimeout(retryTimer);
    retryTimer = null;
  }

  async function stopTransport(): Promise<void> {
    active = false;
    starting = false;
    clearTimers();
    snapshotController?.abort();
    snapshotController = null;
    await dependencies.realtime.stop().catch(() => {});
  }

  function scheduleRetry(): void {
    if (consumers === 0 || !visible) return;
    const delay = RECONNECT_DELAYS_MS[Math.min(retryAttempt, RECONNECT_DELAYS_MS.length - 1)];
    retryAttempt += 1;
    retryTimer = scheduleTimeout(() => {
      retryTimer = null;
      if (consumers > 0 && visible) void startInternal();
    }, delay);
  }

  function scheduleReconciliation(): void {
    clearTimers();
    reconcileTimer = scheduleInterval(() => { void reconcile(); }, SNAPSHOT_INTERVAL_MS);
    ageTimer = scheduleInterval(() => {
      // A new snapshot object makes useSyncExternalStore recompute freshness.
      emit({ ...snapshot, posiciones: [...snapshot.posiciones] });
    }, AGE_RECALC_INTERVAL_MS);
  }

  async function reconcile(): Promise<void> {
    if (!active || snapshotController) return;
    const controller = new AbortController();
    snapshotController = controller;
    try {
      const incoming = await dependencies.fetchSnapshot(controller.signal);
      if (!active || controller.signal.aborted) return;
      emit({
        posiciones: mergeSnapshot(snapshot.posiciones, incoming),
        estado: 'conectado',
        error: null,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (isUnauthorized(error)) {
        emit({
          ...snapshot,
          estado: 'degradado',
          error: 'La sesión expiró; inicia sesión de nuevo.',
        });
        dependencies.onUnauthorized?.();
        clearRetry();
        await stopTransport();
        return;
      }
      emit({ ...snapshot, estado: 'degradado', error: errorMessage(error) });
    } finally {
      if (snapshotController === controller) snapshotController = null;
    }
  }

  function handlePosition(position: UltimaUbicacionCuadrilla): void {
    if (!active) return;
    const current = snapshot.posiciones.find((item) => item.idCuadrilla === position.idCuadrilla);
    const merged = mergeUbicacion(current, position);
    const posiciones = snapshot.posiciones
      .filter((item) => item.idCuadrilla !== position.idCuadrilla)
      .concat(merged)
      .sort((a, b) => a.idCuadrilla - b.idCuadrilla);
    emit({ ...snapshot, posiciones, estado: snapshot.error ? 'degradado' : 'conectado' });
  }

  async function startInternal(): Promise<void> {
    if (starting || active || consumers === 0 || !visible) return;
    starting = true;
    clearRetry();
    updateState('conectando', null);

    try {
      await dependencies.realtime.start(handlePosition, {
        onReconnecting: () => updateState('degradado', 'Reconectando ubicaciones en tiempo real…'),
        onReconnected: () => { void reconcile(); },
        onClosed: () => {
          if (!active || consumers === 0 || !visible) return;
          active = false;
          clearTimers();
          updateState('degradado', 'La conexión de ubicaciones se cerró.');
          scheduleRetry();
        },
      });
      if (!starting) {
        await dependencies.realtime.stop().catch(() => {});
        return;
      }
      active = true;
      starting = false;
      retryAttempt = 0;
      updateState('conectado', null);
      scheduleReconciliation();
      await reconcile();
    } catch (error) {
      starting = false;
      active = false;
      clearTimers();
      await dependencies.realtime.stop().catch(() => {});
      if (isUnauthorized(error)) {
        updateState('degradado', 'La sesión expiró; inicia sesión de nuevo.');
        dependencies.onUnauthorized?.();
        clearRetry();
        return;
      }
      updateState('degradado', errorMessage(error));
      scheduleRetry();
    }
  }

  function stopAll(): void {
    clearRetry();
    void stopTransport();
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    getSnapshot(): UbicacionesStoreSnapshot {
      return snapshot;
    },

    acquire(): void {
      consumers += 1;
      if (consumers === 1 && visible) void startInternal();
    },

    release(): void {
      consumers = Math.max(0, consumers - 1);
      if (consumers === 0) stopAll();
    },

    setVisible(nextVisible: boolean): void {
      if (visible === nextVisible) return;
      visible = nextVisible;
      if (!visible) {
        stopAll();
      } else if (consumers > 0) {
        void startInternal();
      }
    },

    reset(): void {
      consumers = 0;
      retryAttempt = 0;
      stopAll();
      emit({ posiciones: [], estado: 'degradado', error: null });
    },

    refresh(): Promise<void> {
      return reconcile();
    },
  };
}

export type UbicacionesStore = ReturnType<typeof createUbicacionesStore>;
