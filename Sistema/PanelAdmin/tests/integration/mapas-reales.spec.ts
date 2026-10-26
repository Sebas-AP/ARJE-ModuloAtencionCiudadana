import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import {
  API_ORIGIN,
  API_URL,
  INTEGRATION_DB_PATH,
  PANEL_ORIGIN,
} from './constants.ts';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

type AdminLogin = {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    usuario: string;
    rol: string;
  };
};

type CrewLogin = {
  token: string;
  cuadrilla: {
    id: number;
    nombre: string;
  };
};

type ReportResponse = {
  id: number;
  folio?: string;
  latitud: number;
  longitud: number;
  estatus: number;
};

type LocationSample = {
  idMuestra: string;
  fechaCaptura: string;
  latitud: number;
  longitud: number;
  precisionMetros: number;
};

test.describe.configure({ mode: 'serial' });

let admin: AdminLogin;
let north: CrewLogin;
let centro: CrewLogin;
let reportA: ReportResponse;
let reportB: ReportResponse;

async function jsonBody<T>(response: Awaited<ReturnType<APIRequestContext['fetch']>>): Promise<T> {
  if (!response.ok()) {
    throw new Error(`API ${response.status()}: ${await response.text()}`);
  }
  return await response.json() as T;
}

async function apiFetch(
  request: APIRequestContext,
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  return request.fetch(`${API_URL}${path}`, {
    method,
    headers,
    data: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function loginAdmin(request: APIRequestContext): Promise<AdminLogin> {
  return jsonBody<AdminLogin>(await apiFetch(request, 'POST', '/usuarios/login', {
    body: { usuario: 'admin', password: 'Admin123!' },
  }));
}

async function loginCrew(
  request: APIRequestContext,
  usuario: string,
  password: string,
): Promise<CrewLogin> {
  return jsonBody<CrewLogin>(await apiFetch(request, 'POST', '/cuadrillas/login', {
    body: { usuario, password },
  }));
}

async function createCitizenReport(
  request: APIRequestContext,
  suffix: string,
  latitud: number,
  longitud: number,
): Promise<ReportResponse> {
  const response = await apiFetch(request, 'POST', '/reportes', {
    body: {
      tipoProblema: 1,
      descripcion: `Reporte integrado ${suffix} con ubicación confirmada por el ciudadano.`,
      latitud,
      longitud,
      numeroContrato: `E2E-${Date.now()}-${suffix}`,
      nombreCiudadano: `Ciudadano ${suffix}`,
      telefonoCiudadano: '4490000000',
    },
  });
  expect(response.status()).toBe(201);
  const report = await response.json() as ReportResponse;
  expect(report.latitud).toBeCloseTo(latitud, 5);
  expect(report.longitud).toBeCloseTo(longitud, 5);
  return report;
}

async function assignAndAdvance(
  request: APIRequestContext,
  report: ReportResponse,
  crew: CrewLogin,
  finalStatus: 3 | 4,
) {
  const assigned = await apiFetch(request, 'PUT', `/reportes/${report.id}/asignar`, {
    token: admin.token,
    body: { idCuadrilla: crew.cuadrilla.id },
  });
  expect(assigned.status()).toBe(204);

  for (const status of finalStatus === 4 ? [3, 4] : [3]) {
    const advanced = await apiFetch(request, 'PUT', `/reportes/${report.id}/estatus`, {
      token: crew.token,
      body: status,
    });
    expect(advanced.status()).toBe(204);
  }
}

async function sendLocation(
  request: APIRequestContext,
  crew: CrewLogin,
  report: ReportResponse,
  sample: LocationSample,
) {
  return apiFetch(request, 'POST', `/reportes/${report.id}/ubicaciones`, {
    token: crew.token,
    body: { ubicaciones: [sample] },
  });
}

async function waitForMarker(
  page: Page,
  crewId: number,
  latitud: number,
  timeout = 5_000,
) {
  await expect(page.locator(`[data-crew-id="${crewId}"]`))
    .toHaveAttribute('data-crew-lat', String(latitud), { timeout });
}

async function openPanel(
  browser: Browser,
  user: AdminLogin['usuario'],
  token: string,
  expectedVisible: number,
) {
  const context = await browser.newContext({
    baseURL: PANEL_ORIGIN,
    ignoreHTTPSErrors: true,
  });
  await context.addInitScript(({ authToken, authUser }) => {
    localStorage.setItem('arje_admin_token', authToken);
    localStorage.setItem('arje_admin_user', JSON.stringify(authUser));
  }, { authToken: token, authUser: user });
  await context.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    const sockets: WebSocket[] = [];
    const trackedWindow = window as typeof window & { __arjeTestSockets?: WebSocket[] };
    trackedWindow.__arjeTestSockets = sockets;

    const TrackedWebSocket = function (
      this: unknown,
      url: string | URL,
      protocols?: string | string[],
    ) {
      const socket = new NativeWebSocket(url, protocols);
      sockets.push(socket);
      return socket;
    } as unknown as typeof WebSocket;

    TrackedWebSocket.prototype = NativeWebSocket.prototype;
    Object.setPrototypeOf(TrackedWebSocket, NativeWebSocket);
    window.WebSocket = TrackedWebSocket;
  });

  const page = await context.newPage();
  await page.route('https://api.maptiler.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(page.getByTestId('panel-map')).toBeVisible();
  await expect(page.getByText(`${expectedVisible} visibles`)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-ubicaciones-state="conectado"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Cuadrillas sin GPS:')).toBeVisible();

  return { context, page };
}

test.beforeAll(async ({ request }) => {
  admin = await loginAdmin(request);
  north = await loginCrew(request, 'cuadrilla_norte', 'Norte2026!');
  centro = await loginCrew(request, 'cuadrilla_centro', 'Centro2026!');

  reportA = await createCitizenReport(request, 'norte', 21.8853, -102.2916);
  reportB = await createCitizenReport(request, 'centro', 21.8912, -102.2984);

  await assignAndAdvance(request, reportA, north, 3);
  await assignAndAdvance(request, reportB, centro, 4);
});

test('protege el snapshot y el hub administrativo con roles reales', async ({ request }) => {
  const adminSnapshot = await apiFetch(request, 'GET', '/cuadrillas/ubicaciones/ultimas', {
    token: admin.token,
  });
  expect(adminSnapshot.status()).toBe(200);
  const snapshot = await adminSnapshot.json() as Array<{ idCuadrilla: number }>;
  expect(snapshot.map((item) => item.idCuadrilla)).toEqual(
    expect.arrayContaining([north.cuadrilla.id, centro.cuadrilla.id]),
  );

  const crewSnapshot = await apiFetch(request, 'GET', '/cuadrillas/ubicaciones/ultimas', {
    token: north.token,
  });
  expect(crewSnapshot.status()).toBe(403);

  const anonymousSnapshot = await apiFetch(request, 'GET', '/cuadrillas/ubicaciones/ultimas');
  expect(anonymousSnapshot.status()).toBe(401);

  const adminHub = await request.fetch(`${API_ORIGIN}/hubs/ubicaciones/negotiate?negotiateVersion=1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(adminHub.status()).toBe(200);

  const crewHub = await request.fetch(`${API_ORIGIN}/hubs/ubicaciones/negotiate?negotiateVersion=1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${north.token}` },
  });
  expect(crewHub.status()).toBe(403);

  const anonymousHub = await request.fetch(`${API_ORIGIN}/hubs/ubicaciones/negotiate?negotiateVersion=1`, {
    method: 'POST',
  });
  expect(anonymousHub.status()).toBe(401);

  const detail = await apiFetch(request, 'GET', `/reportes/${reportA.id}`, { token: admin.token });
  expect(detail.status()).toBe(200);
  const persisted = await detail.json() as {
    latitud: number;
    longitud: number;
    estatus: number;
    idCuadrillaAsignada: number;
  };
  expect(persisted.latitud).toBeCloseTo(21.8853, 5);
  expect(persisted.longitud).toBeCloseTo(-102.2916, 5);
  expect(persisted.estatus).toBe(3);
  expect(persisted.idCuadrillaAsignada).toBe(north.cuadrilla.id);
});

test('mueve dos sesiones con GPS real y conserva timestamp, orden e idempotencia', async ({ browser, request }) => {
  const panelA = await openPanel(browser, admin.usuario, admin.token, 2);
  const panelB = await openPanel(browser, admin.usuario, admin.token, 2);

  const northMarkerA = panelA.page.locator(`[data-crew-id="${north.cuadrilla.id}"]`);
  const northMarkerB = panelB.page.locator(`[data-crew-id="${north.cuadrilla.id}"]`);
  const centroMarkerA = panelA.page.locator(`[data-crew-id="${centro.cuadrilla.id}"]`);

  await expect(northMarkerA).toHaveCount(0);
  await expect(centroMarkerA).toHaveCount(0);

  const firstSample: LocationSample = {
    idMuestra: 'north-1',
    fechaCaptura: new Date().toISOString(),
    latitud: 21.8904,
    longitud: -102.2991,
    precisionMetros: 7,
  };

  const northStart = Date.now();
  expect((await sendLocation(request, north, reportA, firstSample)).status()).toBe(200);
  await waitForMarker(panelA.page, north.cuadrilla.id, 21.8904);
  const northLatencyA = Date.now() - northStart;
  await waitForMarker(panelB.page, north.cuadrilla.id, 21.8904);
  const northLatencyB = Date.now() - northStart;
  expect(northLatencyA).toBeLessThanOrEqual(5_000);
  expect(northLatencyB).toBeLessThanOrEqual(5_000);
  console.log(`[mapas] latencia norte: sesión A ${northLatencyA} ms, sesión B ${northLatencyB} ms`);
  await expect.poll(async () => Date.parse(await northMarkerA.getAttribute('data-crew-time') ?? ''))
    .toBe(Date.parse(firstSample.fechaCaptura));
  await expect(northMarkerA).toHaveAttribute('data-reciente', 'true');

  const centroSample: LocationSample = {
    idMuestra: 'centro-1',
    fechaCaptura: new Date().toISOString(),
    latitud: 21.8796,
    longitud: -102.2862,
    precisionMetros: 9,
  };
  const centroStart = Date.now();
  expect((await sendLocation(request, centro, reportB, centroSample)).status()).toBe(200);
  await waitForMarker(panelA.page, centro.cuadrilla.id, 21.8796);
  const centroLatencyA = Date.now() - centroStart;
  await waitForMarker(panelB.page, centro.cuadrilla.id, 21.8796);
  const centroLatencyB = Date.now() - centroStart;
  expect(centroLatencyA).toBeLessThanOrEqual(5_000);
  expect(centroLatencyB).toBeLessThanOrEqual(5_000);
  console.log(`[mapas] latencia centro: sesión A ${centroLatencyA} ms, sesión B ${centroLatencyB} ms`);

  const newerSample: LocationSample = {
    idMuestra: 'north-2',
    fechaCaptura: new Date().toISOString(),
    latitud: 21.892,
    longitud: -102.2975,
    precisionMetros: 6,
  };
  expect((await sendLocation(request, north, reportA, newerSample)).status()).toBe(200);
  await waitForMarker(panelA.page, north.cuadrilla.id, 21.892);
  await waitForMarker(panelB.page, north.cuadrilla.id, 21.892);

  const staleSample: LocationSample = {
    idMuestra: 'north-3',
    fechaCaptura: new Date(Date.now() - 10 * 60_000).toISOString(),
    latitud: 21.8,
    longitud: -102.35,
    precisionMetros: 18,
  };
  expect((await sendLocation(request, north, reportA, staleSample)).status()).toBe(200);
  await panelA.page.waitForTimeout(1_000);
  await expect(northMarkerA).toHaveAttribute('data-crew-lat', '21.892');
  await expect(northMarkerB).toHaveAttribute('data-crew-lat', '21.892');

  const db = new DatabaseSync(INTEGRATION_DB_PATH);
  const stored = db.prepare(
    'SELECT COUNT(*) AS count FROM SeguimientosUbicacion WHERE IdReporte = ?',
  ).get(reportA.id) as { count: number };
  expect(stored.count).toBe(3);
  const latest = db.prepare(
    'SELECT Latitud, (julianday(FechaHora) - 2440587.5) * 86400000 AS epochMs FROM SeguimientosUbicacion WHERE IdReporte = ? ORDER BY FechaHora DESC, Id DESC LIMIT 1',
  ).get(reportA.id) as { Latitud: number; epochMs: number };
  expect(Number(latest.Latitud)).toBeCloseTo(21.892, 5);
  expect(Math.abs(Number(latest.epochMs) - Date.parse(newerSample.fechaCaptura))).toBeLessThan(2);
  db.close();

  expect((await sendLocation(request, north, reportA, firstSample)).status()).toBe(200);
  const idempotentDb = new DatabaseSync(INTEGRATION_DB_PATH);
  const afterDuplicate = idempotentDb.prepare(
    'SELECT COUNT(*) AS count FROM SeguimientosUbicacion WHERE IdReporte = ?',
  ).get(reportA.id) as { count: number };
  expect(afterDuplicate.count).toBe(3);
  idempotentDb.close();

  const locations = await apiFetch(
    request,
    'GET',
    `/reportes/${reportA.id}/ubicaciones?registrosPorPagina=50`,
    { token: admin.token },
  );
  expect(locations.status()).toBe(200);
  const locationDtos = await locations.json() as Array<{ fechaHora: string; fechaRecepcion: string | null }>;
  expect(locationDtos.length).toBe(3);
  expect(locationDtos.every((item) => item.fechaHora.endsWith('Z'))).toBe(true);
  expect(locationDtos.every((item) => item.fechaRecepcion === null || item.fechaRecepcion.endsWith('Z'))).toBe(true);

  const cutStartedAt = Date.now();
  await panelA.context.setOffline(true);
  await panelA.page.evaluate(() => {
    const sockets = (window as typeof window & { __arjeTestSockets?: WebSocket[] }).__arjeTestSockets ?? [];
    sockets.forEach((socket) => socket.close(4001, 'integration network cut'));
  });
  await expect(panelA.page.locator('[data-ubicaciones-state="degradado"]'))
    .toBeVisible({ timeout: 10_000 });

  const offlineSample: LocationSample = {
    idMuestra: 'north-4',
    fechaCaptura: new Date().toISOString(),
    latitud: 21.895,
    longitud: -102.295,
    precisionMetros: 5,
  };
  expect((await sendLocation(request, north, reportA, offlineSample)).status()).toBe(200);
  await waitForMarker(panelB.page, north.cuadrilla.id, 21.895);
  await panelA.page.waitForTimeout(1_500);
  await expect(northMarkerA).toHaveAttribute('data-crew-lat', '21.892');

  await panelA.context.setOffline(false);
  await expect(panelA.page.locator('[data-ubicaciones-state="conectado"]'))
    .toBeVisible({ timeout: 35_000 });
  await waitForMarker(panelA.page, north.cuadrilla.id, 21.895, 35_000);
  console.log(`[mapas] recuperación tras corte: ${Date.now() - cutStartedAt} ms`);

  await panelA.page.getByRole('button', { name: 'Reportes', exact: true }).click();
  const returnSample: LocationSample = {
    idMuestra: 'north-5',
    fechaCaptura: new Date().toISOString(),
    latitud: 21.896,
    longitud: -102.294,
    precisionMetros: 4,
  };
  expect((await sendLocation(request, north, reportA, returnSample)).status()).toBe(200);
  await panelA.page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(panelA.page.getByTestId('panel-map')).toBeVisible();
  await expect(panelA.page.locator('[data-ubicaciones-state="conectado"]')).toBeVisible({ timeout: 15_000 });
  await waitForMarker(panelA.page, north.cuadrilla.id, 21.896);
  await expect(panelA.page.locator(`[data-crew-id="${north.cuadrilla.id}"]`)).toHaveCount(1);

  await panelA.context.close();
  await panelB.context.close();
});

test('carga los 235 reportes paginados en el mapa', async ({ browser, request }) => {
  const missing = 233;
  const batchSize = 8;
  for (let start = 0; start < missing; start += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, missing - start) }, (_, index) => {
      const offset = start + index;
      return createCitizenReport(
        request,
        `carga-${offset}`,
        21.7 + (offset % 100) * 0.001,
        -102.4 + (offset % 80) * 0.001,
      );
    });
    await Promise.all(batch);
  }

  const totalResponse = await apiFetch(request, 'GET', '/reportes?pagina=1&registrosPorPagina=1', {
    token: admin.token,
  });
  expect(totalResponse.status()).toBe(200);
  expect(totalResponse.headers()['x-total-count']).toBe('235');

  const startedAt = Date.now();
  const panel = await openPanel(browser, admin.usuario, admin.token, 235);
  const elapsed = Date.now() - startedAt;
  expect(elapsed).toBeLessThan(30_000);
  console.log(`[mapas] 235 reportes cargados en ${elapsed} ms`);
  await expect(panel.page.getByTestId('panel-map')).toBeVisible();
  await panel.context.close();
});
