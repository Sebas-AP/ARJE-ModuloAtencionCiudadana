import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
  type IHttpConnectionOptions,
} from '@microsoft/signalr';
import { getAuthToken } from './api.ts';
import type { UltimaUbicacionCuadrilla } from '../types/ubicaciones';

const viteEnv = import.meta.env ?? {};

export const UBICACIONES_HUB_PATH = '/hubs/ubicaciones';
export const UBICACION_ACTUALIZADA_EVENT = 'ubicacionCuadrillaActualizada';

export interface UbicacionesRealtimeCallbacks {
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onClosed?: () => void;
}

export interface HubConnectionLike {
  on(eventName: string, handler: (payload: UltimaUbicacionCuadrilla) => void): void;
  off(eventName: string, handler: (payload: UltimaUbicacionCuadrilla) => void): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  onreconnecting(callback: () => void): void;
  onreconnected(callback: () => void): void;
  onclose(callback: () => void): void;
}

export interface UbicacionesRealtimeDependencies {
  baseUrl: string;
  getToken: () => string | null;
  createConnection: (url: string, options: IHttpConnectionOptions) => HubConnectionLike;
}

export class UbicacionesRealtimeError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'UbicacionesRealtimeError';
    this.status = status;
  }
}

export function buildUbicacionesHubUrl(apiBaseUrl: string): string {
  const withoutTrailingSlash = apiBaseUrl.replace(/\/+$/, '');
  const withoutApiSuffix = withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash.slice(0, -4)
    : withoutTrailingSlash;
  return `${withoutApiSuffix}${UBICACIONES_HUB_PATH}`;
}

function defaultDependencies(): UbicacionesRealtimeDependencies {
  return {
    baseUrl: viteEnv.VITE_API_BASE_URL || 'http://localhost:5170/api',
    getToken: getAuthToken,
    createConnection: (url, options) => new HubConnectionBuilder()
      .withUrl(url, options)
      .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
      .configureLogging(LogLevel.None)
      .build() as HubConnection,
  };
}

export function createUbicacionesRealtime(
  dependencies: UbicacionesRealtimeDependencies = defaultDependencies(),
) {
  let connection: HubConnectionLike | null = null;
  let activeHandler: ((payload: UltimaUbicacionCuadrilla) => void) | null = null;

  return {
    async start(
      onPosition: (payload: UltimaUbicacionCuadrilla) => void,
      callbacks: UbicacionesRealtimeCallbacks = {},
    ): Promise<void> {
      const token = dependencies.getToken();
      if (!token) {
        throw new UbicacionesRealtimeError('La sesión no está disponible para ubicaciones en tiempo real.', 401);
      }

      await this.stop();

      const hub = dependencies.createConnection(buildUbicacionesHubUrl(dependencies.baseUrl), {
        accessTokenFactory: () => dependencies.getToken() ?? '',
      });
      activeHandler = onPosition;
      hub.on(UBICACION_ACTUALIZADA_EVENT, onPosition);
      hub.onreconnecting(() => callbacks.onReconnecting?.());
      hub.onreconnected(() => callbacks.onReconnected?.());
      hub.onclose(() => callbacks.onClosed?.());
      connection = hub;

      try {
        await hub.start();
      } catch (error) {
        await this.stop();
        const message = error instanceof Error ? error.message : String(error);
        if (/\b401\b|unauthorized|unauthoriz|no autorizada|sesión/i.test(message)) {
          throw new UbicacionesRealtimeError('La sesión expiró; inicia sesión de nuevo.', 401);
        }
        throw error;
      }
    },

    async stop(): Promise<void> {
      const hub = connection;
      const handler = activeHandler;
      connection = null;
      activeHandler = null;
      if (!hub) return;
      if (handler) hub.off(UBICACION_ACTUALIZADA_EVENT, handler);
      await hub.stop().catch(() => {});
    },
  };
}

export const ubicacionesRealtime = createUbicacionesRealtime();
export type UbicacionesRealtime = ReturnType<typeof createUbicacionesRealtime>;
