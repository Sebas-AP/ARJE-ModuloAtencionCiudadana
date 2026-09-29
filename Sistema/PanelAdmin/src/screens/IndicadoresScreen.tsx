import React, { useState } from 'react';
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
import {
  MOCK_GRAFICA_MES,
  MOCK_CATEGORIAS,
  MOCK_CUADRILLAS_RENDIMIENTO,
  MOCK_DASHBOARD_METRICS,
} from '../services/mockData';
import { ReporteDTO, CuadrillaDTO } from '../types';

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

  // Datos para gráfica de tiempo según el periodo seleccionado (02, 03, 04)
  const getTemporalData = () => {
    if (periodo === 'dia') {
      return {
        labels: ['Lun 18', 'Mar 19', 'Mié 20', 'Jue 21', 'Vie 22', 'Sáb 23', 'Dom 24'],
        recibidos: [28, 35, 42, 39, 44, 25, 18],
        resueltos: [26, 32, 38, 36, 40, 24, 17],
      };
    }
    if (periodo === 'semana') {
      return {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        recibidos: [142, 168, 155, 175],
        resueltos: [135, 159, 148, 169],
      };
    }
    // Mes
    return {
      labels: MOCK_GRAFICA_MES.map((g) => g.mes),
      recibidos: MOCK_GRAFICA_MES.map((g) => g.recibidos),
      resueltos: MOCK_GRAFICA_MES.map((g) => g.resueltos),
    };
  };

  const temporal = getTemporalData();

  // 1. Dataset de Gráfica Temporal (Reportes por Mes / Semana / Día)
  const temporalChartData = {
    labels: temporal.labels,
    datasets: [
      {
        label: 'Reportes Recibidos',
        data: temporal.recibidos,
        backgroundColor: '#253C96', // Royal Blue
        borderRadius: 6,
      },
      {
        label: 'Reportes Resueltos',
        data: temporal.resueltos,
        backgroundColor: '#0057D9', // Electric Blue
        borderRadius: 6,
      },
    ],
  };

  // 2. Dataset Donut: Estado de Reportes (05-estado-de-reportes.png)
  const resueltosCount = reportes.filter(
    (r) => r.estatus === 'Resuelto' || r.estatus === 'Completado'
  ).length || 71;
  const enProcesoCount = reportes.filter(
    (r) => r.estatus === 'En Proceso' || r.estatus === 'Asignado'
  ).length || 42;
  const pendientesCount = reportes.filter(
    (r) => r.estatus === 'Pendiente'
  ).length || 15;
  const canceladosCount = reportes.filter(
    (r) => r.estatus === 'Cancelado'
  ).length || 5;

  const donutData = {
    labels: ['Resueltos', 'En Proceso', 'Pendientes', 'Cancelados'],
    datasets: [
      {
        data: [resueltosCount, enProcesoCount, pendientesCount, canceladosCount],
        backgroundColor: [
          '#22C55E', // Verde éxito
          '#0057D9', // Electric blue
          '#F36B2E', // Orange energy
          '#94A3B8', // Gris
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  // 3. Dataset Horizontal Bar: Reportes por Categoría IA (06-reportes-por-categoria.png)
  const categoriasData = {
    labels: MOCK_CATEGORIAS.map((c) => c.categoria),
    datasets: [
      {
        label: 'Total de Incidencias',
        data: MOCK_CATEGORIAS.map((c) => c.total),
        backgroundColor: [
          '#253C96',
          '#0057D9',
          '#00B8D9',
          '#F36B2E',
          '#F59A1E',
          '#3550BA',
          '#64748B',
        ],
        borderRadius: 6,
      },
    ],
  };

  // 4. Dataset Vertical Bar: Cuadrillas con más reportes atendidos (07-cuadrillas-con-mas-reportes-atendidos.png)
  const cuadrillasData = {
    labels: MOCK_CUADRILLAS_RENDIMIENTO.map((c) => c.nombre),
    datasets: [
      {
        label: 'Reportes Atendidos y Resueltos',
        data: MOCK_CUADRILLAS_RENDIMIENTO.map((c) => c.reportesAtendidos),
        backgroundColor: '#0057D9',
        borderRadius: 6,
      },
    ],
  };

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
              {MOCK_DASHBOARD_METRICS.deltaHoy + 12}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-electric-blue)', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={14} />
              <span>+18% vs ayer</span>
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
              94.8% efectividad
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
