import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Activity,
  FileText,
  TrendingUp,
  Award,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, EstatusReporte } from '../types';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface IndicadoresScreenProps {
  reportes: ReporteDTO[];
  cuadrillas: CuadrillaDTO[];
}

export const IndicadoresScreen: React.FC<IndicadoresScreenProps> = ({
  reportes,
  cuadrillas,
}) => {
  const [periodo, setPeriodo] = useState<'mes' | 'semana' | 'dia'>('mes');

  // Datos para gráfica temporal - calcular desde reportes reales
  const temporalData = useMemo(() => {
    const hoy = new Date();
    const labels: string[] = [];
    const recibidos: number[] = [];
    const resueltos: number[] = [];

    if (periodo === 'dia') {
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);
        const diaStr = fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
        labels.push(diaStr);

        const inicioDia = new Date(fecha);
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(fecha);
        finDia.setHours(23, 59, 59, 999);

        const reportesDia = reportes.filter(r => {
          const f = new Date(r.fechaCreacion || r.fechaRecibido);
          return f >= inicioDia && f <= finDia;
        });
        recibidos.push(reportesDia.length);
        resueltos.push(reportesDia.filter(r =>
          r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado
        ).length);
      }
    } else if (periodo === 'semana') {
      for (let i = 3; i >= 0; i--) {
        const semanaInicio = new Date(hoy);
        semanaInicio.setDate(hoy.getDate() - (hoy.getDay() + 7 * i));
        semanaInicio.setHours(0, 0, 0, 0);
        const semanaFin = new Date(semanaInicio);
        semanaFin.setDate(semanaInicio.getDate() + 6);
        semanaFin.setHours(23, 59, 59, 999);

        labels.push(`Semana ${4 - i}`);
        const reportesSemana = reportes.filter(r => {
          const f = new Date(r.fechaCreacion || r.fechaRecibido);
          return f >= semanaInicio && f <= semanaFin;
        });
        recibidos.push(reportesSemana.length);
        resueltos.push(reportesSemana.filter(r =>
          r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado
        ).length);
      }
    } else {
      // Mes - últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const mesFecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mesStr = mesFecha.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
        labels.push(mesStr);

        const mesInicio = new Date(mesFecha);
        const mesFin = new Date(mesFecha.getFullYear(), mesFecha.getMonth() + 1, 0, 23, 59, 59, 999);

        const reportesMes = reportes.filter(r => {
          const f = new Date(r.fechaCreacion || r.fechaRecibido);
          return f >= mesInicio && f <= mesFin;
        });
        recibidos.push(reportesMes.length);
        resueltos.push(reportesMes.filter(r =>
          r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado
        ).length);
      }
    }

    return { labels, recibidos, resueltos };
  }, [reportes, periodo]);

  // 1. Dataset de Gráfica Temporal
  const temporalChartData = {
    labels: temporalData.labels,
    datasets: [
      {
        label: 'Reportes Recibidos',
        data: temporalData.recibidos,
        backgroundColor: '#253C96',
        borderRadius: 6,
      },
      {
        label: 'Reportes Resueltos',
        data: temporalData.resueltos,
        backgroundColor: '#0057D9',
        borderRadius: 6,
      },
    ],
  };

  // 2. Dataset Donut: Estado de Reportes
  const resueltosCount = reportes.filter(
    (r) => r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado
  ).length;
  const enProcesoCount = reportes.filter(
    (r) => r.estatus === EstatusReporte.EnProceso || r.estatus === EstatusReporte.Asignado || r.estatus === EstatusReporte.LevantandoInformacion
  ).length;
  const pendientesCount = reportes.filter(
    (r) => r.estatus === EstatusReporte.Nuevo
  ).length;
  const canceladosCount = reportes.filter(
    (r) => r.estatus === EstatusReporte.EnSupervision
  ).length;

  const donutData = {
    labels: ['Resueltos', 'En Proceso', 'Pendientes', 'En Supervisión'],
    datasets: [
      {
        data: [resueltosCount, enProcesoCount, pendientesCount, canceladosCount],
        backgroundColor: [
          '#22C55E',
          '#0057D9',
          '#F36B2E',
          '#94A3B8',
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  // 3. Dataset Horizontal Bar: Reportes por Categoría IA
  const categoriasData = useMemo(() => {
    const counts: Record<string, number> = {};
    reportes.forEach(r => {
      const cat = r.categoria || 'Sin categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const colors = ['#253C96', '#0057D9', '#00B8D9', '#F36B2E', '#F59A1E', '#3550BA', '#64748B', '#059669', '#EA580C', '#7C3AED'];
    return {
      labels,
      datasets: [{
        label: 'Total de Incidencias',
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]),
        borderRadius: 6,
      }],
    };
  }, [reportes]);

  // 4. Dataset Vertical Bar: Cuadrillas con más reportes atendidos
  const cuadrillasData = useMemo(() => {
    const rendimiento = cuadrillas.map(c => {
      const resueltos = reportes.filter(r =>
        r.idCuadrillaAsignada === c.id &&
        (r.estatus === EstatusReporte.Completado || r.estatus === EstatusReporte.Cerrado)
      ).length;
      return { nombre: c.nombre, resueltos };
    }).filter(c => c.resueltos > 0).sort((a, b) => b.resueltos - a.resueltos);

    return {
      labels: rendimiento.map(c => c.nombre),
      datasets: [{
        label: 'Reportes Atendidos y Resueltos',
        data: rendimiento.map(c => c.resueltos),
        backgroundColor: '#0057D9',
        borderRadius: 6,
      }],
    };
  }, [reportes, cuadrillas]);

  // KPI: Reportes de hoy
  const reportesHoy = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    return reportes.filter(r => {
      const f = new Date(r.fechaCreacion || r.fechaRecibido);
      return f >= hoy && f < manana;
    }).length;
  }, [reportes]);

  // KPI: Efectividad (% de reportes resueltos sobre total con cuadrilla asignada)
  const efectividad = useMemo(() => {
    const conCuadrilla = reportes.filter(r => r.idCuadrillaAsignada != null).length;
    if (conCuadrilla === 0) return 0;
    return Math.round((resueltosCount / conCuadrilla) * 100);
  }, [reportes, resueltosCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 4 KPIs de Alto Nivel (01a, 01b, 01c, 01d) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        {/* KPI 1: Reportes Hoy */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderLeft: '4px solid var(--color-royal-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Reportes Hoy
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-dark-navy)', marginTop: '4px' }}>
              {reportesHoy}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-electric-blue)', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={14} />
              <span>Actualizado en tiempo real</span>
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(37, 60, 150, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-royal-blue)' }}>
            <FileText size={24} />
          </div>
        </div>

        {/* KPI 2: En Proceso */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderLeft: '4px solid var(--color-electric-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              En Proceso
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-dark-navy)', marginTop: '4px' }}>
              {enProcesoCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-electric-blue)', fontWeight: 600, marginTop: '4px' }}>
              Cuadrillas en sitio
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0, 87, 217, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-electric-blue)' }}>
            <Activity size={24} />
          </div>
        </div>

        {/* KPI 3: Pendientes */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderLeft: '4px solid var(--color-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Pendientes
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-dark-navy)', marginTop: '4px' }}>
              {pendientesCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-orange)', fontWeight: 600, marginTop: '4px' }}>
              Por asignar cuadrilla
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-orange-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-orange)' }}>
            <Clock size={24} />
          </div>
        </div>

        {/* KPI 4: Completados */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderLeft: '4px solid var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Completados
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-dark-navy)', marginTop: '4px' }}>
              {resueltosCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600, marginTop: '4px' }}>
              {efectividad}% efectividad
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Fila 1: Gráfica Temporal (02/03/04) + Donut de Estado (05) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '24px',
        }}
      >
        {/* Gráfica Temporal con Selector de Periodo */}
        <div className="card" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                {periodo === 'mes'
                  ? 'Reportes por Mes'
                  : periodo === 'semana'
                  ? 'Reportes por Semana'
                  : 'Reportes por Día'}
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Comparativo de volumen de incidencias recibidas vs resueltas
              </p>
            </div>

            {/* Toggle de Periodo */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setPeriodo('mes')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor:
                    periodo === 'mes'
                      ? 'var(--color-royal-blue)'
                      : 'var(--color-border)',
                  backgroundColor:
                    periodo === 'mes'
                      ? 'var(--color-royal-blue)'
                      : 'var(--color-white)',
                  color:
                    periodo === 'mes'
                      ? 'var(--color-white)'
                      : 'var(--color-text-body)',
                  cursor: 'pointer',
                }}
              >
                Por Mes
              </button>
              <button
                onClick={() => setPeriodo('semana')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor:
                    periodo === 'semana'
                      ? 'var(--color-royal-blue)'
                      : 'var(--color-border)',
                  backgroundColor:
                    periodo === 'semana'
                      ? 'var(--color-royal-blue)'
                      : 'var(--color-white)',
                  color:
                    periodo === 'semana'
                      ? 'var(--color-white)'
                      : 'var(--color-text-body)',
                  cursor: 'pointer',
                }}
              >
                Por Semana
              </button>
              <button
                onClick={() => setPeriodo('dia')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor:
                    periodo === 'dia'
                      ? 'var(--color-royal-blue)'
                      : 'var(--color-border)',
                  backgroundColor:
                    periodo === 'dia'
                      ? 'var(--color-royal-blue)'
                      : 'var(--color-white)',
                  color:
                    periodo === 'dia'
                      ? 'var(--color-white)'
                      : 'var(--color-text-body)',
                  cursor: 'pointer',
                }}
              >
                Por Día
              </button>
            </div>
          </div>

          <div style={{ height: '280px' }}>
            <Bar
              data={temporalChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { font: { family: 'Inter', size: 12 } },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#F1F5F9' },
                  },
                  x: {
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Gráfica Donut: Estado de Reportes (05) */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
              Estado General de los Reportes
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Distribución porcentual por ciclo de vida
            </p>
          </div>

          <div
            style={{
              height: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Doughnut
              data={donutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Inter', size: 11 }, padding: 12 },
                  },
                },
                cutout: '65%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Fila 2: Categorías IA (06) + Desempeño Cuadrillas (07) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.2fr)',
          gap: '24px',
        }}
      >
        {/* Gráfica Horizontal Bar: Reportes por Categoría IA (06) */}
        <div className="card" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--color-royal-blue)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Reportes por Categoría IA
                </h3>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Clasificación automática realizada por el Agente NVIDIA Llama
              </p>
            </div>
          </div>

          <div style={{ height: '300px' }}>
            <Bar
              data={categoriasData}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    grid: { color: '#F1F5F9' },
                  },
                  y: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Gráfica Vertical Bar: Cuadrillas con más reportes atendidos (07) */}
        <div className="card" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--color-electric-blue)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Cuadrillas con Más Reportes Atendidos
                </h3>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Desempeño y volumen acumulado de reparaciones exitosas
              </p>
            </div>
          </div>

          <div style={{ height: '300px' }}>
            <Bar
              data={cuadrillasData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#F1F5F9' },
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      font: { size: 10.5 },
                      maxRotation: 45,
                      minRotation: 25,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
