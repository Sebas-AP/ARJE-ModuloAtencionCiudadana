import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAssignedReportsPath,
  buildLocationBatch,
  createCuadrillaSession,
  fieldApiPaths,
  isActiveAssignedStatus,
} from '../src/services/fieldApiContract.ts';

test('solicita todos los reportes de una cuadrilla y conserva los estados operativos', () => {
  assert.equal(
    buildAssignedReportsPath(17),
    '/reportes?idCuadrillaAsignada=17&registrosPorPagina=100',
  );
  assert.equal(isActiveAssignedStatus(2), true);
  assert.equal(isActiveAssignedStatus(3), true);
  assert.equal(isActiveAssignedStatus(4), true);
  assert.equal(isActiveAssignedStatus(5), false);
});

test('usa las rutas vigentes para estatus, evidencia y ubicaciones en lote', () => {
  assert.equal(fieldApiPaths.estatus(25), '/reportes/25/estatus');
  assert.equal(fieldApiPaths.evidencias(25), '/reportes/25/evidencias');
  assert.equal(fieldApiPaths.ubicaciones(25), '/reportes/25/ubicaciones');
  assert.equal(fieldApiPaths.disponibilidad(8), '/cuadrillas/8/disponibilidad');
});

test('envuelve cada ubicación en el lote requerido por la API', () => {
  assert.deepEqual(
    buildLocationBatch([{ latitud: 21.8853, longitud: -102.2916 }]),
    { ubicaciones: [{ latitud: 21.8853, longitud: -102.2916 }] },
  );
});

test('conserva todos los puntos de un lote de ubicación', () => {
  assert.deepEqual(buildLocationBatch([
    { latitud: 21.8, longitud: -102.3 },
    { latitud: 21.9, longitud: -102.4 },
  ]), { ubicaciones: [
    { latitud: 21.8, longitud: -102.3 },
    { latitud: 21.9, longitud: -102.4 },
  ] });
});

test('normaliza la respuesta de login de cuadrilla sin depender del perfil administrativo', () => {
  assert.deepEqual(
    createCuadrillaSession({
      token: 'jwt-de-cuadrilla',
      cuadrilla: {
        id: 8,
        nombre: 'Cuadrilla Norte',
        integrantes: 'Ana, Leo',
        usuarioApp: 'cuadrilla_norte',
        estatusDisponibilidad: 2,
        reportesAsignadosCount: 1,
      },
    }),
    {
      token: 'jwt-de-cuadrilla',
      cuadrilla: {
        id: 8,
        nombre: 'Cuadrilla Norte',
        integrantes: 'Ana, Leo',
        usuarioApp: 'cuadrilla_norte',
        estatusDisponibilidad: 2,
        reportesAsignadosCount: 1,
      },
    },
  );
});
