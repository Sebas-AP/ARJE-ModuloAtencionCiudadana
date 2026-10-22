import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMockMode } from '../src/services/mockMode.ts';

test('la configuración explícita de entorno desactiva un mock persistido', () => {
  assert.equal(resolveMockMode('false', 'true'), false);
});

test('ignora un modo mock persistido cuando no hay configuración de entorno', () => {
  assert.equal(resolveMockMode(undefined, 'true'), false);
});

test('no habilita datos mock aunque exista una configuración heredada', () => {
  assert.equal(resolveMockMode('true', 'true'), false);
});
