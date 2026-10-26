import assert from 'node:assert/strict';
import test from 'node:test';

import type { ReporteDTO } from '../src/types/index.ts';
import { buildAssignedMapModel } from '../src/services/mapaAsignadosModel.ts';

function reporte(id: number, estatus: number, latitud = 21.88, longitud = -102.29): ReporteDTO {
  return { id, estatus, latitud, longitud } as ReporteDTO;
}

test('incluye todos los reportes operativos asignados con coordenadas válidas', () => {
  const model = buildAssignedMapModel([
    reporte(1, 2),
    reporte(2, 3),
    reporte(3, 4),
    reporte(4, 5),
    reporte(5, 6),
    reporte(6, 7),
  ], null);

  assert.deepEqual(model.markers.map((marker) => marker.id), [1, 2, 3]);
  assert.equal(model.selectedId, 1);
});

test('acepta coordenadas cero y descarta coordenadas fuera de rango o no finitas', () => {
  const model = buildAssignedMapModel([
    reporte(1, 2, 0, 0),
    reporte(2, 3, 91, -102.29),
    reporte(3, 4, 21.88, -181),
    reporte(4, 2, Number.NaN, -102.29),
  ], null);

  assert.deepEqual(model.markers.map((marker) => marker.id), [1]);
  assert.deepEqual(model.markers[0], { id: 1, latitud: 0, longitud: 0, estatus: 2 });
});

test('respeta el reporte autorizado que llega desde la navegación', () => {
  const model = buildAssignedMapModel([reporte(10, 3), reporte(20, 4)], 20);
  assert.equal(model.selectedId, 20);
});

test('un identificador ajeno o inactivo cae al primer marcador autorizado', () => {
  const reportes = [reporte(10, 3), reporte(20, 4), reporte(30, 5)];

  assert.equal(buildAssignedMapModel(reportes, 30).selectedId, 10);
  assert.equal(buildAssignedMapModel(reportes, 999).selectedId, 10);
  assert.equal(buildAssignedMapModel(reportes, null).selectedId, 10);
});

test('conserva la selección al refrescar y la reubica si el reporte deja de estar autorizado', () => {
  const refreshed = buildAssignedMapModel([reporte(10, 3), reporte(20, 4)], 20);
  assert.equal(refreshed.selectedId, 20);

  const withoutSelected = buildAssignedMapModel([reporte(10, 3), reporte(20, 5)], 20);
  assert.equal(withoutSelected.selectedId, 10);
});

test('sin reportes autorizados no hay marcadores ni selección', () => {
  const model = buildAssignedMapModel([reporte(1, 5), reporte(2, 3, Number.POSITIVE_INFINITY, 0)], 1);
  assert.deepEqual(model.markers, []);
  assert.equal(model.selectedId, null);
});
