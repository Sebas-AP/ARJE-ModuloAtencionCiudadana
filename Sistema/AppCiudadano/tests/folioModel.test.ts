import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFolio } from '../src/services/folioModel.ts';

test('parsea un folio válido en id y número de contrato', () => {
  assert.deepEqual(parseFolio('FOL-482-A12345'), { id: 482, numeroContrato: 'A12345' });
});

test('es insensible a mayúsculas y recorta espacios', () => {
  assert.deepEqual(parseFolio('  fol-7-abc  '), { id: 7, numeroContrato: 'abc' });
});

test('conserva guiones dentro del número de contrato', () => {
  assert.deepEqual(parseFolio('FOL-9-A-1-2'), { id: 9, numeroContrato: 'A-1-2' });
});

test('un número de contrato simple no es un folio', () => {
  assert.equal(parseFolio('A12345'), null);
});

test('folio sin número de contrato no es válido', () => {
  assert.equal(parseFolio('FOL-482-'), null);
});

test('folio con id no numérico no es válido', () => {
  assert.equal(parseFolio('FOL-ABC-123'), null);
});
