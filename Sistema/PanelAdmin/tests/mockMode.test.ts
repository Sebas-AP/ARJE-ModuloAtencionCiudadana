import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMockMode } from '../src/services/mockMode.ts';

test('la configuración explícita de entorno desactiva un mock persistido', () => {
  assert.equal(resolveMockMode('false', 'true'), false);
});

test('conserva la preferencia persistida cuando no hay configuración de entorno', () => {
  assert.equal(resolveMockMode(undefined, 'true'), true);
});
