import assert from 'node:assert/strict';
import test from 'node:test';
import { mobileRuntime } from './helpers/mobileRuntime.ts';

test('status is durable before HTTP and keeps the numeric status payload', async () => {
  const app = mobileRuntime();
  app.respondWith(async (url, options) => {
    assert.equal(app.pending()[0].kind, 'status');
    assert.equal(url.endsWith('/reportes/19/estatus'), true);
    assert.equal(options.method, 'PUT');
    assert.equal(options.body, '3');
    return { ok: true, status: 204 };
  });
  await app.load('reportesService').reportesService.actualizarEstatus(19, { estatus: 3 });
  assert.equal(app.requests.length, 1);
  assert.deepEqual(app.pending(), []);
});

test('offline status stays pending without rejecting an already saved action', async () => {
  const app = mobileRuntime();
  app.respondWith(async () => { throw new Error('Network request failed'); });
  await app.load('reportesService').reportesService.actualizarEstatus(19, { estatus: 4 });
  assert.deepEqual(app.pending().map(({ kind, status, attempts }: any) => ({ kind, status, attempts })),
    [{ kind: 'status', status: 4, attempts: 1 }]);
});

test('unsupported field status is rejected before persistence or HTTP', async () => {
  const app = mobileRuntime();
  await assert.rejects(app.load('reportesService').reportesService.actualizarEstatus(19, { estatus: 7 }),
    /Estatus operativo inválido/);
  assert.deepEqual(app.pending(), []);
  assert.equal(app.requests.length, 0);
});

test('evidence is copied to durable storage before multipart upload and removed after confirmation', async () => {
  const app = mobileRuntime();
  app.respondWith(async (url, options) => {
    assert.equal(url.endsWith('/reportes/19/evidencias'), true);
    const durableUri = app.pending()[0].uri;
    assert.match(durableUri, /^file:\/\/documents\/arje-evidence\//);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(options.body.fields)), [
      ['tipo', '2'], ['archivo', { uri: durableUri, name: 'photo.jpg', type: 'image/jpeg' }],
    ]);
    return { ok: true, status: 200, json: async () => ({ id: 50 }) };
  });
  await app.load('reportesService').reportesService.subirEvidenciaResolucion(19, 'file://photo.jpg', 'photo.jpg', 'image/jpeg');
  assert.equal(app.requests.length, 1);
  assert.deepEqual(app.pending(), []);
});

test('missing evidence is rejected before it can be queued as a valid upload', async () => {
  const app = mobileRuntime();
  await assert.rejects(
    app.load('reportesService').reportesService.subirEvidenciaResolucion(19, 'file://missing.jpg', 'missing.jpg', 'image/jpeg'),
    /ya no está disponible/,
  );
  assert.deepEqual(app.pending(), []);
  assert.equal(app.requests.length, 0);
});

test('a lost durable evidence stays pending with an actionable recovery message', async () => {
  const app = mobileRuntime();
  app.respondWith(async () => { throw new Error('Network request failed'); });
  await app.load('reportesService').reportesService.subirEvidenciaResolucion(19, 'file://photo.jpg', 'photo.jpg', 'image/jpeg');
  const [operation] = app.pending();
  app.removeFile(operation.uri);
  app.respondWith(async () => ({ ok: true, status: 200, json: async () => ({ id: 1 }) }));

  await app.load('fieldOperationsService').syncFieldOperations();
  assert.match(app.pending()[0].lastError, /ya no está disponible/);
  assert.equal(app.pending()[0].terminal, false);
  assert.equal(app.requests.length, 1);
});

test('background task queues every GPS point for its session owner and requests one sync', async () => {
  const app = mobileRuntime();
  const location = app.load('locationService');
  await location.setLocationSessionOwner(8);
  await location.setActiveReporteId(19);
  app.respondWith(async (url) => {
    assert.equal(url.endsWith('/reportes/19/ubicaciones'), true);
    assert.deepEqual(app.pending().map(({ reportId, latitud, longitud, ownerCuadrillaId }: any) => ({ reportId, latitud, longitud, ownerCuadrillaId })), [
      { reportId: 19, latitud: 21.8, longitud: -102.3, ownerCuadrillaId: 8 },
      { reportId: 19, latitud: 21.9, longitud: -102.4, ownerCuadrillaId: 8 },
    ]);
    return { ok: true, status: 204 };
  });
  await app.tasks.get(location.LOCATION_TASK)!({ data: { locations: [
    { coords: { latitude: 21.8, longitude: -102.3 } },
    { coords: { latitude: 21.9, longitude: -102.4 } },
  ] } });
  assert.deepEqual(app.pending(), []);
  assert.equal(app.requests.length, 1);
  await app.tasks.get(location.LOCATION_TASK)!({ data: { locations: [] } });
  assert.equal(app.requests.length, 1);
});

test('background task drops locations when the tracked owner no longer matches the session', async () => {
  const app = mobileRuntime();
  const location = app.load('locationService');
  await location.setLocationSessionOwner(8);
  await location.setActiveReporteId(19);
  await location.setLocationSessionOwner(9);

  await app.tasks.get(location.LOCATION_TASK)!({ data: { locations: [
    { coords: { latitude: 21.8, longitude: -102.3 } },
  ] } });

  assert.deepEqual(app.pending(), []);
  assert.equal(app.requests.length, 0);
});

test('logout clears active tracking before a later background location can be queued', async () => {
  const app = mobileRuntime();
  const location = app.load('locationService');
  const auth = app.load('authService').authService;
  await location.setLocationSessionOwner(8);
  await location.setActiveReporteId(19);

  await auth.logout();
  await app.tasks.get(location.LOCATION_TASK)!({ data: { locations: [
    { coords: { latitude: 21.8, longitude: -102.3 } },
  ] } });

  assert.deepEqual(app.pending(), []);
  assert.equal(app.requests.length, 0);
});

for (const trigger of ['login', 'restore']) {
  test(`${trigger} preserves a valid session if queue storage cannot be read`, async () => {
    const app = mobileRuntime();
    app.storage.get = () => { throw new Error('Storage unavailable'); };
    app.respondWith(async (url) => ({ ok: true, status: 200, json: async () =>
      url.endsWith('/cuadrillas/login') ? { token: 'new-token', cuadrilla: app.cuadrilla } : app.cuadrilla,
    }));
    const auth = app.load('authService').authService;
    const session = trigger === 'login' ? (await auth.login('norte', 'password')).cuadrilla : await auth.getCurrentCuadrilla();
    assert.equal(session?.id, 8);
    assert.equal(auth.getCurrentCuadrillaSync()?.id, 8);
  });

  test(`${trigger} flushes existing durable operations after establishing the session`, async () => {
    const app = mobileRuntime();
    app.storage.set('arje_field_operation_queue', JSON.stringify([{
      kind: 'status', reportId: 19, status: 3, ownerCuadrillaId: 8, id: 'pending', createdAt: '2026-10-12', attempts: 0, terminal: false,
    }]));
    app.respondWith(async (url, options) => {
      if (url.endsWith('/cuadrillas/login')) return { ok: true, status: 200, json: async () => ({ token: 'new-token', cuadrilla: app.cuadrilla }) };
      if (url.endsWith('/cuadrillas/me')) return { ok: true, status: 200, json: async () => app.cuadrilla };
      assert.equal(options.headers.Authorization, trigger === 'login' ? 'Bearer new-token' : 'Bearer test-token');
      return { ok: true, status: 204 };
    });
    const auth = app.load('authService').authService;
    if (trigger === 'login') await auth.login('norte', 'password');
    else await auth.getCurrentCuadrilla();
    assert.deepEqual(app.pending(), []);
    assert.equal(app.requests.filter(({ url }) => url.endsWith('/reportes/19/estatus')).length, 1);
  });
}

test('availability and GPS use existing API contracts through the shared queue', async () => {
  const app = mobileRuntime();
  const operations = app.load('fieldOperationsService');
  await operations.fieldOperationQueue.enqueue({ kind: 'location', reportId: 19, latitud: 21.8, longitud: -102.3 });
  await operations.fieldOperationQueue.enqueue({ kind: 'location', reportId: 19, latitud: 21.9, longitud: -102.4 });
  app.respondWith(async (url) => url.endsWith('/cuadrillas/me')
    ? { ok: true, status: 200, json: async () => app.cuadrilla }
    : { ok: true, status: 204 });
  await operations.queueAvailability(2);
  assert.deepEqual(app.requests.filter(({ url }) => !url.endsWith('/cuadrillas/me')).map(({ url, options }) => ({
    path: new URL(url).pathname, method: options.method, payload: JSON.parse(options.body),
  })), [
    { path: '/api/reportes/19/ubicaciones', method: 'POST', payload: { ubicaciones: [
      { latitud: 21.8, longitud: -102.3 }, { latitud: 21.9, longitud: -102.4 },
    ] } },
    { path: '/api/cuadrillas/8/disponibilidad', method: 'PUT', payload: { estatusDisponibilidad: 2 } },
  ]);
  assert.deepEqual(app.pending(), []);
});

test('changing sessions never sends the prior cuadrilla operations and availability keeps its original target', async () => {
  const app = mobileRuntime();
  const operations = app.load('fieldOperationsService');
  const auth = app.load('authService').authService;
  app.respondWith(async () => { throw new Error('Network request failed'); });
  await operations.queueAvailability(2);
  operations.setFieldOperationOwner(8);
  await operations.fieldOperationQueue.enqueue({ kind: 'status', reportId: 19, status: 3 });
  app.requests.length = 0;
  auth.setCurrentCuadrilla({ ...app.cuadrilla, id: 9 });
  app.respondWith(async () => ({ ok: true, status: 204 }));

  await operations.syncFieldOperations();
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.pending().map(({ ownerCuadrillaId }: any) => ownerCuadrillaId), [8, 8]);

  operations.setFieldOperationOwner(8);
  await operations.syncFieldOperations();
  assert.deepEqual(app.requests.map(({ url }) => new URL(url).pathname), [
    '/api/cuadrillas/8/disponibilidad', '/api/reportes/19/estatus',
  ]);
});

test('a field operation refuses a changed token immediately before transport', async () => {
  const app = mobileRuntime();
  const operations = app.load('fieldOperationsService');
  await operations.fieldOperationQueue.enqueue({ kind: 'status', reportId: 19, status: 3 });
  app.onTokenRead((read) => {
    if (read === 2) {
      operations.setFieldOperationOwner(9);
      app.secure.set('arje_token', 'other-session-token');
    }
  });

  await operations.syncFieldOperations();

  assert.equal(app.requests.length, 0);
  operations.setFieldOperationOwner(8);
  assert.equal(JSON.stringify((await operations.fieldOperationQueue.list()).map(({ reportId }: any) => reportId)), '[19]');
});

test('simultaneous application sync triggers share the same in-flight send', async () => {
  const app = mobileRuntime();
  const operations = app.load('fieldOperationsService');
  await operations.fieldOperationQueue.enqueue({ kind: 'status', reportId: 19, status: 3 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  app.respondWith(async () => { await gate; return { ok: true, status: 204 }; });
  const first = operations.syncFieldOperations();
  const second = operations.syncFieldOperations();
  release();
  await Promise.all([first, second]);
  assert.equal(app.requests.length, 1);
  assert.deepEqual(app.pending(), []);
});
