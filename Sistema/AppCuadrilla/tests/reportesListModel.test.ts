import assert from 'node:assert/strict';
import test from 'node:test';
import { filterReportes, toReporteCardModel } from '../src/services/reportesListModel.ts';
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
