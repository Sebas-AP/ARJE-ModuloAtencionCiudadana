import type { ReporteDTO } from '../types';

export type ReportStatusFilter = 'all' | 'pending' | 'inProgress' | 'completed';

export interface ReporteCardModel {
  folio: string;
  category: string;
  location: string;
  date: string;
}

const matchesStatus = (estatus: number, filter: ReportStatusFilter) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return estatus === 1 || estatus === 2 || estatus === 3;
  if (filter === 'inProgress') return estatus === 4;
  return estatus === 5 || estatus === 6 || estatus === 7;
};

const searchable = (report: ReporteDTO) => [
  report.folio, report.categoria, report.tipoReporte, report.descripcion, report.direccion,
].filter(Boolean).join(' ').toLocaleLowerCase('es-MX');

export const filterReportes = (reportes: ReporteDTO[], query: string, status: ReportStatusFilter): ReporteDTO[] => {
  const needle = query.trim().toLocaleLowerCase('es-MX');
  return reportes.filter((report) => matchesStatus(report.estatus, status) && (!needle || searchable(report).includes(needle)));
};

export const toReporteCardModel = (reporte: ReporteDTO): ReporteCardModel => ({
  folio: reporte.folio || `REP-${reporte.id}`,
  category: reporte.categoria || reporte.tipoReporte || 'Sin categoría',
  location: reporte.direccion || 'Ubicación no disponible',
  date: reporte.fechaRecibido ? new Date(reporte.fechaRecibido).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha no disponible',
});
