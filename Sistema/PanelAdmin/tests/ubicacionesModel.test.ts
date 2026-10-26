import assert from 'node:assert/strict';
import test from 'node:test';

import type { UltimaPosicionCuadrilla, UltimaUbicacionCuadrilla } from '../src/types/ubicaciones.ts';
import {
  chooseNewestPosition,
  countVisibleReports,
  isRecentLocation,
  mergeSnapshot,
  mergeUbicacion,
  toCrewMapPositions,
} from '../src/services/ubicacionesModel.ts';
import type { ReporteDTO } from '../src/types/index.ts';

const NOW = Date.parse('2026-10-26T12:00:00.000Z');

function posicion(overrides: Partial<UltimaPosicionCuadrilla> = {}): UltimaPosicionCuadrilla {
  return {
    idSeguimiento: 10,
    idReporte: 19,
    folioReporte: 'REP-19',
    latitud: 21.8853,
    longitud: -102.2916,
    fechaHora: '2026-10-26T11:59:30.000Z',
    fechaRecepcion: '2026-10-26T12:00:10.000Z',
    precisionMetros: 8,
    ...overrides,
  };
}

function ubicacion(
  idCuadrilla: number,
  posicionValue: UltimaPosicionCuadrilla | null,
): UltimaUbicacionCuadrilla {
  return { idCuadrilla, cuadrillaNombre: `Cuadrilla ${idCuadrilla}`, posicion: posicionValue };
}

test('una cuadrilla con posición produce exactamente un marcador', () => {
  assert.deepEqual(toCrewMapPositions([ubicacion(8, posicion())], NOW), [{
    idCuadrilla: 8,
    nombre: 'Cuadrilla 8',
    lat: 21.8853,
    lng: -102.2916,
    idSeguimiento: 10,
    idReporte: 19,
    folioReporte: 'REP-19',
    fechaHora: '2026-10-26T11:59:30.000Z',
    precisionMetros: 8,
    reciente: true,
  }]);
});

test('acepta coordenadas cero y rechaza posiciones nulas o inválidas', () => {
  const zero = toCrewMapPositions([ubicacion(1, posicion({ latitud: 0, longitud: 0 }))], NOW);
  assert.equal(zero.length, 1);
  assert.equal(zero[0].lat, 0);
  assert.equal(zero[0].lng, 0);

  assert.deepEqual(toCrewMapPositions([ubicacion(2, null)], NOW), []);
  assert.deepEqual(toCrewMapPositions([ubicacion(3, posicion({ latitud: Number.NaN }))], NOW), []);
  assert.deepEqual(toCrewMapPositions([ubicacion(4, posicion({ longitud: 181 }))], NOW), []);
});

test('ordena versiones por fechaHora y después por idSeguimiento', () => {
  const sameTimeOlder = posicion({ idSeguimiento: 4, fechaHora: '2026-10-26T11:59:00.000Z' });
  const sameTimeNewer = posicion({ idSeguimiento: 5, fechaHora: '2026-10-26T11:59:00.000Z' });
  const later = posicion({ idSeguimiento: 2, fechaHora: '2026-10-26T11:59:30.000Z' });

  assert.equal(chooseNewestPosition(sameTimeOlder, sameTimeNewer)?.idSeguimiento, 5);
  assert.equal(chooseNewestPosition(sameTimeNewer, later)?.idSeguimiento, 2);
  assert.equal(chooseNewestPosition(later, sameTimeOlder)?.idSeguimiento, 2);
});

test('un snapshot tardío no pisa un evento reciente', () => {
  const recentEvent = ubicacion(8, posicion({ idSeguimiento: 50, fechaHora: '2026-10-26T11:59:55.000Z', latitud: 21.9 }));
  const lateSnapshot = ubicacion(8, posicion({ idSeguimiento: 49, fechaHora: '2026-10-26T11:59:40.000Z', latitud: 21.8 }));

  const merged = mergeUbicacion(recentEvent, lateSnapshot);
  assert.equal(merged.posicion?.idSeguimiento, 50);
  assert.equal(merged.posicion?.latitud, 21.9);

  const fromKnown = mergeSnapshot([recentEvent], [lateSnapshot]);
  assert.equal(fromKnown[0].posicion?.idSeguimiento, 50);
});

test('un evento nuevo reemplaza la posición aunque el snapshot llegue después', () => {
  const initial = ubicacion(8, posicion({ idSeguimiento: 1, latitud: 21.8 }));
  const event = ubicacion(8, posicion({ idSeguimiento: 2, latitud: 21.9, fechaHora: '2026-10-26T11:59:50.000Z' }));
  const merged = mergeSnapshot([initial], [event]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].posicion?.idSeguimiento, 2);
});

test('una posición sin GPS no crea marcador y un snapshot no borra la última posición conocida', () => {
  const known = ubicacion(8, posicion());
  assert.deepEqual(toCrewMapPositions([ubicacion(8, null)], NOW), []);
  assert.equal(mergeSnapshot([known], [ubicacion(8, null)])[0].posicion?.idSeguimiento, 10);
});

test('la antigüedad usa la captura, no la recepción, y respeta el límite de 120 s', () => {
  assert.equal(isRecentLocation('2026-10-26T11:59:00.000Z', NOW), true);
  assert.equal(isRecentLocation('2026-10-26T11:58:00.000Z', NOW), true);
  assert.equal(isRecentLocation('2026-10-26T11:57:59.999Z', NOW), false);
  assert.equal(isRecentLocation('2026-10-26T12:02:00.000Z', NOW), true);
  assert.equal(isRecentLocation('2026-10-26T12:02:00.001Z', NOW), false);
});

test('N visibles cuenta sólo reportes con coordenadas válidas, incluido cero', () => {
  const reportes = [
    { id: 1, latitud: 0, longitud: 0 },
    { id: 2, latitud: 21.8, longitud: -102.3 },
    { id: 3, latitud: Number.NaN, longitud: -102.3 },
    { id: 4, latitud: 91, longitud: -102.3 },
  ] as ReporteDTO[];
  assert.equal(countVisibleReports(reportes), 2);
});
