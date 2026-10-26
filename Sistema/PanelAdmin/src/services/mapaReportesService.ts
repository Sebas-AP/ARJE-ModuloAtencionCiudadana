import type { ReporteDTO } from '../types';
import { apiClientWithHeaders } from './api.ts';

export const REPORTES_PAGE_SIZE = 100;

export type ReportesMapPage = { data: ReporteDTO[]; total: number };
export type FetchReportesMapPage = (
  endpoint: string,
  options: RequestInit,
) => Promise<ReportesMapPage>;

function abortError(): Error {
  const error = new Error('Consulta de reportes cancelada.');
  error.name = 'AbortError';
  return error;
}

export async function getReportesParaMapa(
  signal?: AbortSignal,
  fetchPage: FetchReportesMapPage = (endpoint, options) =>
    apiClientWithHeaders<ReporteDTO[]>(endpoint, options),
): Promise<ReporteDTO[]> {
  if (signal?.aborted) throw abortError();

  const first = await fetchPage(
    `/reportes?pagina=1&registrosPorPagina=${REPORTES_PAGE_SIZE}`,
    { signal },
  );
  if (signal?.aborted) throw abortError();

  const totalPages = Math.ceil(first.total / REPORTES_PAGE_SIZE);
  const pages = [first.data];
  for (let page = 2; page <= totalPages; page++) {
    if (signal?.aborted) throw abortError();
    const next = await fetchPage(
      `/reportes?pagina=${page}&registrosPorPagina=${REPORTES_PAGE_SIZE}`,
      { signal },
    );
    if (signal?.aborted) throw abortError();
    pages.push(next.data);
  }

  const unique = new Map<number, ReporteDTO>();
  for (const reporte of pages.flat()) {
    if (!unique.has(reporte.id)) unique.set(reporte.id, reporte);
  }
  return [...unique.values()];
}
