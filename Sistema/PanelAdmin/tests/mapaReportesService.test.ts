import assert from 'node:assert/strict';
import test from 'node:test';

import type { ReporteDTO } from '../src/types/index.ts';
import { parsePaginationTotal } from '../src/services/api.ts';
import { getReportesParaMapa } from '../src/services/mapaReportesService.ts';

function reporte(id: number): ReporteDTO {
  return { id } as ReporteDTO;
}

test('prefiere x-total-count y acepta cantidadTotalRegistros como respaldo', () => {
  assert.equal(parsePaginationTotal(new Headers({ 'x-total-count': '235' })), 235);
  assert.equal(parsePaginationTotal(new Headers({ 'cantidadTotalRegistros': '42' })), 42);
  assert.equal(
    parsePaginationTotal(new Headers({ 'x-total-count': '235', 'cantidadTotalRegistros': '42' })),
    235,
  );
});

test('sin total o con un total inválido falla de forma explícita', () => {
  assert.throws(() => parsePaginationTotal(new Headers()), /total/i);
  assert.throws(() => parsePaginationTotal(new Headers({ 'x-total-count': 'muchos' })), /total/i);
  assert.throws(() => parsePaginationTotal(new Headers({ 'x-total-count': '-1' })), /total/i);
});

test('pagina hasta total, deduplica ids y conserva el orden', async () => {
  const total = 235;
  const all = Array.from({ length: total }, (_, index) => reporte(index + 1));
  const requestedPages: number[] = [];

  const loaded = await getReportesParaMapa(undefined, async (endpoint) => {
    const page = new URL(endpoint, 'http://localhost');
    const pagina = Number(page.searchParams.get('pagina'));
    const size = Number(page.searchParams.get('registrosPorPagina'));
    requestedPages.push(pagina);
    const data = all.slice((pagina - 1) * size, pagina * size);
    if (pagina === 2) data.unshift(reporte(1));
    return { data, total };
  });

  assert.deepEqual(requestedPages, [1, 2, 3]);
  assert.equal(loaded.length, total);
  assert.deepEqual(loaded.map((item) => item.id), all.map((item) => item.id));
});

test('un total de cero hace una sola consulta y no devuelve datos', async () => {
  let calls = 0;
  const loaded = await getReportesParaMapa(undefined, async () => {
    calls += 1;
    return { data: [], total: 0 };
  });
  assert.equal(calls, 1);
  assert.deepEqual(loaded, []);
});

test('propaga el fallo de una página sin devolver datos parciales', async () => {
  await assert.rejects(
    getReportesParaMapa(undefined, async (endpoint) => {
      if (endpoint.includes('pagina=2')) throw new Error('Página 2 no disponible');
      return { data: [reporte(1)], total: 150 };
    }),
    /Página 2 no disponible/,
  );
});

test('una cancelación antes de pedir la primera página no consulta la API', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;

  await assert.rejects(
    getReportesParaMapa(controller.signal, async () => {
      calls += 1;
      return { data: [reporte(1)], total: 1 };
    }),
    (error: unknown) => error instanceof Error && error.name === 'AbortError',
  );
  assert.equal(calls, 0);
});
