import assert from 'node:assert/strict';
import test from 'node:test';

import type { ReporteDTO } from '../src/types/index.ts';
import { buildWebMapModel } from '../src/services/webMapModel.ts';

function reporte(id: number, estatus: number, latitud = 21.88, longitud = -102.29): ReporteDTO {
  return { id, estatus, latitud, longitud } as ReporteDTO;
}

test('el modelo web conserva selección y coordenadas del modelo nativo', () => {
  const model = buildWebMapModel([
    reporte(10, 3, 21.9, -102.3),
    reporte(20, 4, 0, 0),
  ], 20, null);

  assert.deepEqual(model.markers, [
    { id: 10, latitud: 21.9, longitud: -102.3, estatus: 3 },
    { id: 20, latitud: 0, longitud: 0, estatus: 4 },
  ]);
  assert.equal(model.selectedId, 20);
});

test('sin permiso de ubicación conserva los marcadores de reportes', () => {
  const model = buildWebMapModel([reporte(10, 2), reporte(20, 5)], null, null);
  assert.deepEqual(model.markers.map((marker) => marker.id), [10]);
  assert.equal(model.selectedId, 10);
  assert.equal(model.ownLocation, null);
});

test('acepta ubicación propia cero y descarta coordenadas inválidas', () => {
  const zero = buildWebMapModel([reporte(1, 3)], 1, { latitude: 0, longitude: 0 });
  assert.deepEqual(zero.ownLocation, { latitude: 0, longitude: 0 });

  const invalid = buildWebMapModel([reporte(1, 3)], 1, { latitude: 95, longitude: 0 });
  assert.equal(invalid.ownLocation, null);
});

test('un identificador de navegación ajeno cae al primer reporte autorizado', () => {
  const model = buildWebMapModel([reporte(10, 3), reporte(20, 4)], 999, null);
  assert.equal(model.selectedId, 10);
});
