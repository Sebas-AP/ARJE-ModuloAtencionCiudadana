import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveApiBaseUrl } from '../src/services/apiConfiguration.ts';

test('usa localhost para la API web cuando no se configuró una URL', () => {
  assert.equal(resolveApiBaseUrl('web'), 'http://localhost:5170/api');
});

test('requiere una URL LAN explícita para un teléfono real', () => {
  assert.equal(
    resolveApiBaseUrl('android'),
    'http://10.0.2.2:5170/api',
  );
});

test('conserva la URL LAN configurada y elimina la diagonal final', () => {
  assert.equal(
    resolveApiBaseUrl('android', 'http://192.168.1.70:5170/api/'),
    'http://192.168.1.70:5170/api',
  );
});
