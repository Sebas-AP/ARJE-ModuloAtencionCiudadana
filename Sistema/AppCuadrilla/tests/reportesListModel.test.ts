import assert from 'node:assert/strict';
import test from 'node:test';
import { filterReportes, toReporteCardModel } from '../src/services/reportesListModel.ts';
import { getReporteStatusVisual } from '../src/services/reportesListModel.ts';
import type { ReporteDTO } from '../src/types/index.ts';

const reportes: ReporteDTO[] = [
  { id: 1, folio: 'FOL-01', categoria: 'Bache', descripcion: 'Avenida central', direccion: 'Morelos 2', fechaRecibido: '2026-10-15T00:00:00Z', estatus: 2 } as ReporteDTO,
  { id: 2, folio: 'FOL-02', categoria: 'Fuga de agua', descripcion: 'Fuga en la calle', direccion: 'Hidalgo 142', fechaRecibido: '2026-10-16T00:00:00Z', estatus: 4 } as ReporteDTO,
];

test('filters by folio, category, description and address without changing source order', () => {
  assert.deepEqual(filterReportes(reportes, 'hidALGO', 'all').map((report) => report.id), [2]);
});

test('normalizes missing optional values for a report card', () => {
  assert.deepEqual(toReporteCardModel({ id: 7, descripcion: 'Sin fuga', estatus: 2 } as ReporteDTO), {
    folio: 'REP-7', category: 'Sin categoría', location: 'Ubicación no disponible', date: 'Fecha no disponible',
  });
});

test('status filters distinguish pending, active and completed reports', () => {
  const rows = [{ id: 1, estatus: 2 }, { id: 2, estatus: 4 }, { id: 3, estatus: 5 }] as ReporteDTO[];
  assert.deepEqual(filterReportes(rows, '', 'inProgress').map((report) => report.id), [2]);
});

test('maps assignment statuses to the Figma card badge palette', () => {
  assert.deepEqual(getReporteStatusVisual(2), { label: 'Pendiente', background: '#FFE0AA', color: '#F59E0B' });
  assert.deepEqual(getReporteStatusVisual(4), { label: 'En Proceso', background: '#E8F1FF', color: '#015FEB' });
  assert.deepEqual(getReporteStatusVisual(5), { label: 'Completado', background: 'rgba(16, 185, 129, 0.31)', color: '#10B981' });
});
