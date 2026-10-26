import { expect, test, type Page, type WebSocketRoute } from '@playwright/test';

const RECORD_SEPARATOR = '\x1e';
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

type Posicion = {
  idSeguimiento: number;
  idReporte: number;
  folioReporte: string;
  latitud: number;
  longitud: number;
  fechaHora: string;
  fechaRecepcion: string | null;
  precisionMetros: number | null;
};

type UltimaUbicacion = {
  idCuadrilla: number;
  cuadrillaNombre: string;
  posicion: Posicion | null;
};

const REPORTES = [
  {
    id: 101,
    folio: 'REP-101',
    tipoProblema: 1,
    categoria: 'Fuga de agua',
    descripcion: 'Fuga visible frente al parque.',
    latitud: 21.8853,
    longitud: -102.2916,
    fechaRecibido: '2026-10-26T16:00:00.000Z',
    estatus: 1,
    totalEvidencias: 0,
  },
  {
    id: 102,
    folio: 'REP-102',
    tipoProblema: 2,
    categoria: 'Drenaje y alcantarillado',
    descripcion: 'Drenaje obstruido en la avenida principal.',
    latitud: 21.8912,
    longitud: -102.2984,
    fechaRecibido: '2026-10-26T16:10:00.000Z',
    estatus: 2,
    totalEvidencias: 0,
  },
  {
    id: 103,
    folio: 'REP-103',
    tipoProblema: 1,
    categoria: 'Fuga de agua',
    descripcion: 'Tubería rota en la banqueta.',
    latitud: 21.8789,
    longitud: -102.2851,
    fechaRecibido: '2026-10-26T16:20:00.000Z',
    estatus: 2,
    totalEvidencias: 0,
  },
];

const CUADRILLAS = [
  {
    id: 1,
    nombre: 'Cuadrilla Norte',
    integrantes: 'Ana, Luis',
    usuarioApp: 'cuadrilla.norte',
    estatusDisponibilidad: 2,
    reportesActivosCount: 1,
  },
  {
    id: 2,
    nombre: 'Cuadrilla Sur',
    integrantes: 'Marta, José',
    usuarioApp: 'cuadrilla.sur',
    estatusDisponibilidad: 2,
    reportesActivosCount: 1,
  },
  {
    id: 3,
    nombre: 'Cuadrilla Evento',
    integrantes: 'Eva, Raúl',
    usuarioApp: 'cuadrilla.evento',
    estatusDisponibilidad: 1,
    reportesActivosCount: 0,
  },
];

function buildSnapshot(): UltimaUbicacion[] {
  const now = Date.now();
  return [
    {
      idCuadrilla: 1,
      cuadrillaNombre: 'Cuadrilla Norte',
      posicion: {
        idSeguimiento: 11,
        idReporte: 102,
        folioReporte: 'REP-102',
        latitud: 21.8904,
        longitud: -102.2991,
        fechaHora: new Date(now - 110_000).toISOString(),
        fechaRecepcion: new Date(now - 108_000).toISOString(),
        precisionMetros: 7,
      },
    },
    {
      idCuadrilla: 2,
      cuadrillaNombre: 'Cuadrilla Sur',
      posicion: {
        idSeguimiento: 12,
        idReporte: 103,
        folioReporte: 'REP-103',
        latitud: 21.8796,
        longitud: -102.2862,
        fechaHora: new Date(now - 10 * 60_000).toISOString(),
        fechaRecepcion: new Date(now - 10 * 60_000).toISOString(),
        precisionMetros: 15,
      },
    },
    {
      idCuadrilla: 3,
      cuadrillaNombre: 'Cuadrilla Evento',
      posicion: null,
    },
  ];
}

function eventPosition(): Posicion {
  return {
    idSeguimiento: 31,
    idReporte: 103,
    folioReporte: 'REP-103',
    latitud: 21.8835,
    longitud: -102.2875,
    fechaHora: new Date().toISOString(),
    fechaRecepcion: new Date().toISOString(),
    precisionMetros: 6,
  };
}

async function preparePage(page: Page, tileFailureBudget = 0): Promise<{ getSocket: () => WebSocketRoute | null }> {
  let socket: WebSocketRoute | null = null;
  let remainingTileFailures = tileFailureBudget;
  const snapshot = buildSnapshot();

  await page.addInitScript(() => {
    localStorage.setItem('arje_admin_token', 'e2e-token');
    localStorage.setItem('arje_admin_user', JSON.stringify({
      id: 1,
      nombre: 'Administrador E2E',
      usuario: 'admin',
      rol: 1,
      activo: true,
    }));
  });

  await page.route('**/api/reportes**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'x-total-count': String(REPORTES.length) },
      body: JSON.stringify(REPORTES),
    });
  });

  await page.route('**/api/cuadrillas**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/ubicaciones/ultimas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(snapshot),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CUADRILLAS),
    });
  });

  await page.route('**/hubs/ubicaciones/negotiate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        negotiateVersion: 1,
        connectionId: 'e2e-connection',
        connectionToken: 'e2e-token',
        availableTransports: [
          { transport: 'WebSockets', transferFormats: ['Text', 'Binary'] },
        ],
      }),
    });
  });

  await page.routeWebSocket('**/hubs/ubicaciones**', (ws) => {
    socket = ws;
    let handshakeCompleted = false;
    ws.onMessage((message) => {
      if (handshakeCompleted) return;
      handshakeCompleted = true;
      expect(String(message)).toContain('protocol');
      ws.send(`{}${RECORD_SEPARATOR}`);
    });
  });

  await page.route('https://api.maptiler.com/**', async (route) => {
    if (remainingTileFailures > 0) {
      remainingTileFailures -= 1;
      await route.fulfill({ status: 500, contentType: 'text/plain', body: 'tile failure' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
  });

  return { getSocket: () => socket };
}

async function openMap(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(page.getByTestId('panel-map')).toBeVisible();
  await expect(page.getByText('3 visibles')).toBeVisible();
}

test('selecciona, filtra, centra y actualiza ubicaciones recientes sin evento nuevo', async ({ page }) => {
  const { getSocket } = await preparePage(page);
  await openMap(page);

  const crewNorte = page.locator('[data-crew-id="1"]');
  const crewSur = page.locator('[data-crew-id="2"]');
  await expect(crewNorte).toHaveAttribute('data-reciente', 'true');
  await expect(crewSur).toHaveAttribute('data-reciente', 'false');
  await expect(page.getByText('Cuadrillas sin GPS:')).toBeVisible();
  await expect(page.getByText('Cuadrilla Evento', { exact: true })).toBeVisible();

  await page.locator('[data-report-id="102"]').click();
  await page.getByRole('button', { name: 'Ver Seguimiento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'REP-102' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver Seguimiento Detallado' })).toBeVisible();

  await page.getByRole('button', { name: 'Centrar en el mapa' }).click();
  await expect.poll(async () => Number(await page.getByTestId('panel-map').getAttribute('data-map-center-lat')))
    .toBeCloseTo(21.8912, 2);
  await expect.poll(async () => Number(await page.getByTestId('panel-map').getAttribute('data-map-center-lng')))
    .toBeCloseTo(-102.2984, 2);

  await page.getByRole('button', { name: 'Cerrar detalle' }).click();
  await page.getByLabel('Filtrar por categoría').selectOption('fuga');
  await expect(page.getByText('2 visibles')).toBeVisible();
  await page.getByLabel('Filtrar por estatus').selectOption('2');
  await expect(page.getByText('1 visibles')).toBeVisible();
  await page.getByLabel('Filtrar por categoría').selectOption('todas');
  await page.getByLabel('Filtrar por estatus').selectOption('todos');
  await expect(page.getByText('3 visibles')).toBeVisible();

  await expect(crewNorte).toHaveAttribute('data-reciente', 'false', { timeout: 25_000 });

  const socket = getSocket();
  expect(socket).not.toBeNull();
  socket!.send(JSON.stringify({
    type: 1,
    target: 'ubicacionCuadrillaActualizada',
    arguments: [{
      idCuadrilla: 3,
      cuadrillaNombre: 'Cuadrilla Evento',
      posicion: eventPosition(),
    }],
  }) + RECORD_SEPARATOR);

  const crewEvento = page.locator('[data-crew-id="3"]');
  await expect(crewEvento).toHaveAttribute('data-reciente', 'true');
  await expect(page.getByText('Cuadrillas sin GPS:')).toBeHidden();
  await crewEvento.dispatchEvent('click');
  await expect(page.getByText('Ubicación reciente')).toBeVisible();
  await expect(page.getByText(/Reporte: REP-103/)).toBeVisible();
});

test('recupera la carga de tiles desde el aviso visible', async ({ page }) => {
  await preparePage(page, 1);
  await openMap(page);

  await expect(page.getByText('No se pudieron cargar los mapas.')).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByText('No se pudieron cargar los mapas.')).toBeHidden();
});
