import {
  DashboardMetricsDTO,
  GraficaMesDTO,
  CategoriaCountDTO,
  CuadrillaRendimientoDTO,
  MotivoCountDTO,
  ReporteDTO,
  EstatusReporte,
  PrioridadReporte,
  TipoProblema,
  CuadrillaDTO,
} from '../types';
import { reportesService } from './reportesService';
import { cuadrillasService } from './cuadrillasService';

function computeMetrics(reportes: ReporteDTO[], cuadrillas: CuadrillaDTO[]): DashboardMetricsDTO {
  const total = reportes.length;
  const resueltos = reportes.filter(
    (r) => r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado
  ).length;
  const pendientes = reportes.filter(
    (r) => r.estatus === EstatusReporte.Nuevo || r.estatus === EstatusReporte.Asignado
  ).length;
  const enProceso = reportes.filter(
    (r) => r.estatus === EstatusReporte.EnProceso || r.estatus === EstatusReporte.LevantandoInformacion
  ).length;

  // Delta hoy - reportes creados hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const deltaHoy = reportes.filter((r) => new Date(r.fechaRecibido) >= hoy).length;
  
  // Delta resueltos hoy - reportes con fechaResolucion hoy
  const deltaResueltos = reportes.filter((r) => 
    r.fechaResolucion && new Date(r.fechaResolucion) >= hoy
  ).length;

  return {
    reportesTotales: total,
    totalReportes: total,
    reportesResueltos: resueltos,
    reportesPendientes: pendientes,
    reportesEnProceso: enProceso,
    deltaHoy,
    deltaEnProceso: 0,
    deltaPendientes: 0,
    deltaResueltos,
  };
}

function computeGraficaMes(reportes: ReporteDTO[]): GraficaMesDTO[] {
  const meses = new Map<string, { recibidos: number; resueltos: number }>();
  const ahora = new Date();
  
  // Inicializar últimos 12 meses
  for (let i = 11; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = fecha.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
    meses.set(key, { recibidos: 0, resueltos: 0 });
  }

  reportes.forEach((r) => {
    // Contar recibidos por fecha de creación
    const fechaRecibido = new Date(r.fechaRecibido);
    const keyRecibido = fechaRecibido.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
    if (meses.has(keyRecibido)) {
      meses.get(keyRecibido)!.recibidos += 1;
    }

    // Contar resueltos por fecha de resolución
    if (r.fechaResolucion) {
      const fechaResol = new Date(r.fechaResolucion);
      const keyResuelto = fechaResol.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      if (meses.has(keyResuelto)) {
        meses.get(keyResuelto)!.resueltos += 1;
      }
    }
  });

  return Array.from(meses.entries()).map(([mes, { recibidos, resueltos }]) => ({ mes, recibidos, resueltos }));
}

function computeCategorias(reportes: ReporteDTO[]): CategoriaCountDTO[] {
  const categorias = new Map<string, { cantidad: number; tipoProblema: TipoProblema }>();
  
  reportes.forEach((r) => {
    const cat = r.categoria || 'Sin categoría';
    const existing = categorias.get(cat);
    if (existing) {
      existing.cantidad += 1;
    } else {
      categorias.set(cat, { cantidad: 1, tipoProblema: r.tipoProblema });
    }
  });

  const total = reportes.length || 1;
  return Array.from(categorias.entries())
    .map(([categoria, { cantidad, tipoProblema }]) => ({
      categoria,
      tipoProblema,
      total: cantidad,
      porcentaje: Math.round((cantidad / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

function computeCuadrillasRendimiento(reportes: ReporteDTO[], cuadrillas: CuadrillaDTO[]): CuadrillaRendimientoDTO[] {
  return cuadrillas.map((c) => {
    const reportesCuadrilla = reportes.filter((r) => r.idCuadrillaAsignada === c.id);
    const resueltos = reportesCuadrilla.filter((r) => 
      (r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado) && r.fechaResolucion
    );
    const atendidos = resueltos.length;

    // Calcular tiempo promedio de resolución en minutos
    let tiempoPromedioMinutos = 0;
    if (atendidos > 0) {
      const totalMinutos = resueltos.reduce((acc, r) => {
        const recibido = new Date(r.fechaRecibido).getTime();
        const resuelto = new Date(r.fechaResolucion!).getTime();
        return acc + (resuelto - recibido) / (1000 * 60);
      }, 0);
      tiempoPromedioMinutos = Math.round(totalMinutos / atendidos);
    }

    return {
      idCuadrilla: c.id,
      nombre: c.nombre,
      reportesAtendidos: atendidos,
      tiempoPromedioMinutos,
    };
  });
}

const MOTIVO_EN_PROCESO_LABELS: Record<number, string> = {
  1: 'Llegando al lugar',
  2: 'Levantando información',
  3: 'Pidiendo herramientas y materiales',
  4: 'Comenzando con la reparación',
  5: 'Otro',
};

const MOTIVO_RESOLUCION_LABELS: Record<number, string> = {
  1: 'Fuga reparada',
  2: 'Suministro restablecido',
  3: 'Falla solucionada',
  4: 'Calidad del agua mejorada',
  5: 'Uso indebido corregido',
  6: 'Otro',
};

function countByMotivo(reportes: ReporteDTO[], field: 'motivoEnProceso' | 'motivoResolucion', labels: Record<number, string>): MotivoCountDTO[] {
  const conteos = new Map<number, number>();
  reportes.forEach((r) => {
    const motivo = r[field];
    if (motivo == null) return;
    conteos.set(motivo, (conteos.get(motivo) ?? 0) + 1);
  });

  const total = reportes.length || 1;
  return Array.from(conteos.entries())
    .map(([motivo, cantidad]) => ({
      motivo,
      etiqueta: labels[motivo] ?? `Motivo ${motivo}`,
      total: cantidad,
      porcentaje: Math.round((cantidad / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

// Motivo por el que los reportes ACTUALMENTE en proceso siguen abiertos — p. ej.
// detectar que muchos están "Pidiendo herramientas y materiales" para decidir comprar más.
export function computeMotivosEnProceso(reportes: ReporteDTO[]): MotivoCountDTO[] {
  const enProceso = reportes.filter((r) => r.estatus === EstatusReporte.EnProceso);
  return countByMotivo(enProceso, 'motivoEnProceso', MOTIVO_EN_PROCESO_LABELS);
}

// Distribución histórica de por qué se resolvieron los reportes ya completados/cerrados.
export function computeMotivosResolucion(reportes: ReporteDTO[]): MotivoCountDTO[] {
  const resueltos = reportes.filter((r) => r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado);
  return countByMotivo(resueltos, 'motivoResolucion', MOTIVO_RESOLUCION_LABELS);
}

export const indicadoresService = {
  /**
   * Obtener métricas principales del dashboard
   */
  async getMetrics(): Promise<DashboardMetricsDTO> {
    const [reportes, cuadrillas] = await Promise.all([
      reportesService.getAll({ registrosPorPagina: 1000 }),
      cuadrillasService.getAll(),
    ]);
    return computeMetrics(reportes.data, cuadrillas);
  },

  /**
   * Obtener serie histórica mensual de reportes
   */
  async getGraficaMes(): Promise<GraficaMesDTO[]> {
    const { data: reportes } = await reportesService.getAll({ registrosPorPagina: 1000 });
    return computeGraficaMes(reportes);
  },

  /**
   * Obtener conteo y porcentaje por categoría clasificada por IA
   */
  async getCategorias(): Promise<CategoriaCountDTO[]> {
    const { data: reportes } = await reportesService.getAll({ registrosPorPagina: 1000 });
    return computeCategorias(reportes);
  },

  /**
   * Obtener tabla de rendimiento por cuadrilla
   */
  async getCuadrillasRendimiento(): Promise<CuadrillaRendimientoDTO[]> {
    const [reportes, cuadrillas] = await Promise.all([
      reportesService.getAll({ registrosPorPagina: 1000 }),
      cuadrillasService.getAll(),
    ]);
    return computeCuadrillasRendimiento(reportes.data, cuadrillas);
  },

  /**
   * Motivos por los que los reportes en proceso ahora mismo siguen sin completarse
   */
  async getMotivosEnProceso(): Promise<MotivoCountDTO[]> {
    const { data: reportes } = await reportesService.getAll({ registrosPorPagina: 1000 });
    return computeMotivosEnProceso(reportes);
  },

  /**
   * Distribución histórica de los motivos de resolución de reportes completados/cerrados
   */
  async getMotivosResolucion(): Promise<MotivoCountDTO[]> {
    const { data: reportes } = await reportesService.getAll({ registrosPorPagina: 1000 });
    return computeMotivosResolucion(reportes);
  },
};
