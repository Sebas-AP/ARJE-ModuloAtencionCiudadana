import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRemoteReportes } from '../src/services/remoteReportesLoad.ts';

test('propaga un fallo de API real sin reintentar la misma consulta', async () => {
  let attempts = 0;
  const unavailableApi = async (): Promise<never> => {
    attempts += 1;
    throw new Error('La API no está disponible');
  };

  await assert.rejects(loadRemoteReportes(unavailableApi), /La API no está disponible/);
  assert.equal(attempts, 1);
});
