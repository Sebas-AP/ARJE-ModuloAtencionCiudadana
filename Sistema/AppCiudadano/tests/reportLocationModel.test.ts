import assert from 'node:assert/strict';
import test from 'node:test';

import type { Coordenadas } from '../src/types/index.ts';
import {
  applySuggestedCoordinate,
  getConfirmedReportLocation,
  selectCoordinate,
} from '../src/services/reportLocationModel.ts';

const manual: Coordenadas = { latitud: 21.8853, longitud: -102.2916 };

test('sin coordenada o sin confirmación no hay ubicación válida para enviar', () => {
  assert.equal(getConfirmedReportLocation(null, false), null);
  assert.equal(getConfirmedReportLocation(null, true), null);
  assert.equal(getConfirmedReportLocation(manual, false), null);
});

test('una coordenada manual confirmada se conserva para envío online u offline', () => {
  assert.deepEqual(getConfirmedReportLocation(manual, true), manual);
  assert.deepEqual(getConfirmedReportLocation({ ...manual }, true), manual);
});

test('el GPS sugerido se conserva cuando ya existe un pin seleccionado', () => {
  const lateGps = { latitud: 21.9, longitud: -102.3 };
  assert.equal(applySuggestedCoordinate(manual, lateGps), manual);
  assert.deepEqual(applySuggestedCoordinate(null, lateGps), lateGps);
});

test('cambiar el pin invalida la confirmación anterior', () => {
  const selection = selectCoordinate({ latitud: 21.9, longitud: -102.3 });
  assert.deepEqual(selection, {
    coordenada: { latitud: 21.9, longitud: -102.3 },
    confirmada: false,
  });
});

test('acepta coordenadas cero y rechaza NaN o rangos inválidos', () => {
  const zero = { latitud: 0, longitud: 0 };
  assert.deepEqual(getConfirmedReportLocation(zero, true), zero);
  assert.deepEqual(selectCoordinate(zero).coordenada, zero);

  assert.equal(selectCoordinate({ latitud: Number.NaN, longitud: 0 }).coordenada, null);
  assert.equal(selectCoordinate({ latitud: 91, longitud: 0 }).coordenada, null);
  assert.equal(selectCoordinate({ latitud: 0, longitud: -181 }).coordenada, null);
  assert.equal(getConfirmedReportLocation({ latitud: 91, longitud: 0 }, true), null);
});

test('una sugerencia inválida no produce ubicación', () => {
  assert.equal(applySuggestedCoordinate(null, { latitud: Number.POSITIVE_INFINITY, longitud: 0 }), null);
  assert.equal(applySuggestedCoordinate(null, null), null);
});
