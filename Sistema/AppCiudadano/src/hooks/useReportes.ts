import { useState, useCallback } from 'react';
import { reportesService, ReportesFilters } from '../services/reportes';
import { ReporteDTO, ReporteDetalleDTO, PaginatedResponse, ReportePublicoDTO, ReporteConsultaPaginadoDTO } from '../types';

export function useReportes(initialFilters: ReportesFilters = {}) {
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportesFilters>({
    pagina: 1,
    registrosPorPagina: 10,
    ...initialFilters,
  });
  const [hasMore, setHasMore] = useState(true);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const fetchReportes = useCallback(async (newFilters: ReportesFilters, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await reportesService.getAll(newFilters);
      if (append) {
        setReportes((prev) => [...prev, ...response.data]);
      } else {
        setReportes(response.data);
      }
      setTotalRegistros(response.totalRegistros);
      setHasMore(response.data.length > 0 && (response.pagina * response.registrosPorPagina) < response.totalRegistros);
      setFilters(response);
    } catch (err: any) {
      setError(err.message || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchReportes({ ...filters, pagina: 1 }, false);
  }, [fetchReportes, filters]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchReportes({ ...filters, pagina: (filters.pagina || 1) + 1 }, true);
  }, [fetchReportes, filters, hasMore, loading]);

  const applyFilters = useCallback(async (newFilters: Partial<ReportesFilters>) => {
    const merged = { ...filters, ...newFilters, pagina: 1 };
    await fetchReportes(merged, false);
  }, [fetchReportes, filters]);

  const clearFilters = useCallback(async () => {
    const defaultFilters = { pagina: 1, registrosPorPagina: 10 };
    await fetchReportes(defaultFilters, false);
  }, [fetchReportes]);

  return {
    reportes,
    loading,
    error,
    filters,
    hasMore,
    totalRegistros,
    fetchReportes,
    refresh,
    loadMore,
    applyFilters,
    clearFilters,
    setFilters,
  };
}

export function useReporteDetalle(id: number) {
  const [reporte, setReporte] = useState<ReporteDetalleDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportesService.getById(id);
      setReporte(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { reporte, loading, error, refetch: fetch };
}

export function useConsultaPublica() {
  const [reportes, setReportes] = useState<ReportePublicoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchReportes = useCallback(async (numeroContrato: string, newPagina = 1, append = false) => {
    if (!numeroContrato.trim()) {
      setReportes([]);
      setTotalRegistros(0);
      setHasMore(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await reportesService.consultaPublica(numeroContrato.trim(), newPagina, 50);
      if (append) {
        setReportes((prev) => [...prev, ...response.data]);
      } else {
        setReportes(response.data);
      }
      setTotalRegistros(response.totalRegistros);
      setPagina(response.pagina);
      setHasMore(response.pagina < response.totalPaginas);
    } catch (err: any) {
      setError(err.message || 'Error al consultar reportes');
      setReportes([]);
      setTotalRegistros(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (numeroContrato: string) => {
    await fetchReportes(numeroContrato, 1, false);
  }, [fetchReportes]);

  const loadMore = useCallback(async (numeroContrato: string) => {
    if (!hasMore || loading) return;
    await fetchReportes(numeroContrato, pagina + 1, true);
  }, [fetchReportes, pagina, hasMore, loading]);

  return {
    reportes,
    loading,
    error,
    totalRegistros,
    hasMore,
    fetchReportes,
    refresh,
    loadMore,
  };
}

export function useReportePublicoDetalle() {
  const [reporte, setReporte] = useState<ReportePublicoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (id: number, numeroContrato: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportesService.getPublicoById(id, numeroContrato);
      setReporte(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar reporte');
      setReporte(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { reporte, loading, error, refetch: fetch };
}