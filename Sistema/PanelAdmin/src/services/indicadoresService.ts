import {
  DashboardMetricsDTO,
  GraficaMesDTO,
  CategoriaCountDTO,
  CuadrillaRendimientoDTO,
} from '../types';
import {
  MOCK_DASHBOARD_METRICS,
  MOCK_GRAFICA_MES,
  MOCK_CATEGORIAS,
  MOCK_CUADRILLAS_RENDIMIENTO,
} from './mockData';

export const indicadoresService = {
  /**
   * Obtener métricas principales del dashboard
   */
  async getMetrics(): Promise<DashboardMetricsDTO> {
    return { ...MOCK_DASHBOARD_METRICS };
  },

  /**
   * Obtener serie histórica mensual de reportes
   */
  async getGraficaMes(): Promise<GraficaMesDTO[]> {
    return [...MOCK_GRAFICA_MES];
  },

  /**
   * Obtener conteo y porcentaje por categoría clasificada por IA
   */
  async getCategorias(): Promise<CategoriaCountDTO[]> {
    return [...MOCK_CATEGORIAS];
  },

  /**
   * Obtener tabla de rendimiento por cuadrilla
   */
  async getCuadrillasRendimiento(): Promise<CuadrillaRendimientoDTO[]> {
    return [...MOCK_CUADRILLAS_RENDIMIENTO];
  },
};
