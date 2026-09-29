import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  Eye,
  UserPlus,
  Sparkles,
  ClipboardCheck,
  RotateCcw,
  Search,
} from 'lucide-react';
import { ReporteDTO, CuadrillaDTO, EstatusReporte } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface ReportesScreenProps {
  reportes: ReporteDTO[];
  cuadrillas: CuadrillaDTO[];
  onSelectReporte: (reporteId: number) => void;
  onOpenAsignarModal: (reporte: ReporteDTO) => void;
  onOpenCorregirModal: (reporte: ReporteDTO) => void;
  onOpenSupervisionModal: (reporte: ReporteDTO) => void;
}

export const ReportesScreen: React.FC<ReportesScreenProps> = ({
  reportes,
  cuadrillas,
  onSelectReporte,
  onOpenAsignarModal,
  onOpenCorregirModal,
  onOpenSupervisionModal,
}) => {
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterSector, setFilterSector] = useState<string>('todos');
  const [ordenarPor, setOrdenarPor] = useState<'recientes' | 'prioridad'>('recientes');
  const [busqueda, setBusqueda] = useState<string>('');

  // Extraer categorías únicas
  const categorias = useMemo(() => {
    const set = new Set<string>();
    reportes.forEach((r) => {
      if (r.categoria) set.add(r.categoria);
    });
    return Array.from(set);
  }, [reportes]);

  // Filtrado y ordenamiento
  const filteredReportes = useMemo(() => {
    let list = reportes.filter((r) => {
      const matchBusqueda =
        busqueda === '' ||
        (r.folio && r.folio.toLowerCase().includes(busqueda.toLowerCase())) ||
        r.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.categoria && r.categoria.toLowerCase().includes(busqueda.toLowerCase()));

      let matchEstado = true;
      if (filterEstado !== 'todos') {
        const s = String(r.estatus).toLowerCase();
        if (filterEstado === 'pendiente') matchEstado = s.includes('nuevo') || s.includes('pendiente') || !r.cuadrillaAsignadaNombre;
        else if (filterEstado === 'en proceso') matchEstado = s.includes('proceso') || s.includes('asignado');
        else if (filterEstado === 'resuelto') matchEstado = s.includes('resuelto') || s.includes('completado');
      }

      const matchCat =
        filterCategoria === 'todas' ||
        (r.categoria && r.categoria.toLowerCase() === filterCategoria.toLowerCase());

      const sectorNum = String((r.id % 15) + 1);
      const matchSector = filterSector === 'todos' || sectorNum === filterSector;

      return matchBusqueda && matchEstado && matchCat && matchSector;
    });

    if (ordenarPor === 'prioridad') {
      const prioridadWeight: Record<string, number> = { Alta: 3, Media: 2, Baja: 1 };
      list.sort((a, b) => (prioridadWeight[b.prioridad || 'Media'] || 0) - (prioridadWeight[a.prioridad || 'Media'] || 0));
    } else {
      list.sort((a, b) => {
        const da = new Date(a.fechaCreacion || a.fechaRecibido || 0).getTime();
        const db = new Date(b.fechaCreacion || b.fechaRecibido || 0).getTime();
        return db - da;
      });
    }

    return list;
  }, [reportes, filterEstado, filterCategoria, filterSector, ordenarPor, busqueda]);

  const getTiempoTranscurrido = (fecha?: string) => {
    if (!fecha) return 'hace 30min';
    const diffMs = Date.now() - new Date(fecha).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `hace ${Math.max(5, diffMins)}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    return `hace ${Math.floor(diffHours / 24)}d`;
  };

  const handleResetFilters = () => {
    setFilterEstado('todos');
    setFilterCategoria('todas');
    setFilterSector('todos');
    setOrdenarPor('recientes');
    setBusqueda('');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '10px 0',
      }}
    >
      {/* Título de Pantalla */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#19244E',
            margin: 0,
          }}
        >
          Reportes
        </h2>

        {/* Buscador de apoyo */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio, problema..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          />
          <Search
            size={15}
            color="#94A3B8"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          />
        </div>
      </div>

      {/* Barra de Filtros Exacta de Figma: "Filtrar por :" y "Ordenar por :" */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Filtrar por : */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#19244E',
            }}
          >
            Filtrar por :
          </span>

          {/* Estado Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{
                appearance: 'none',
                padding: '7px 28px 7px 14px',
                borderRadius: '20px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#19244E',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="todos">Estado</option>
              <option value="pendiente">Pendiente</option>
              <option value="en proceso">En proceso</option>
              <option value="resuelto">Resuelto</option>
            </select>
            <ChevronDown
              size={14}
              color="#64748B"
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Categoría Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              style={{
                appearance: 'none',
                padding: '7px 28px 7px 14px',
                borderRadius: '20px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#19244E',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '180px',
              }}
            >
              <option value="todas">Categoría</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              color="#64748B"
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Sector Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              style={{
                appearance: 'none',
                padding: '7px 28px 7px 14px',
                borderRadius: '20px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#19244E',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="todos">Sector</option>
              {['2', '5', '10', '11', '12', '15'].map((s) => (
                <option key={s} value={s}>
                  Sector {s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              color="#64748B"
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>
        </div>

        {/* Ordenar por : */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#19244E',
            }}
          >
            Ordenar por :
          </span>

          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              overflow: 'hidden',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setOrdenarPor('recientes')}
              style={{
                border: 'none',
                background: ordenarPor === 'recientes' ? '#253C96' : 'transparent',
                color: ordenarPor === 'recientes' ? '#FFFFFF' : '#64748B',
                padding: '5px 14px',
                borderRadius: '16px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Recientes
            </button>
            <button
              onClick={() => setOrdenarPor('prioridad')}
              style={{
                border: 'none',
                background: ordenarPor === 'prioridad' ? '#253C96' : 'transparent',
                color: ordenarPor === 'prioridad' ? '#FFFFFF' : '#64748B',
                padding: '5px 14px',
                borderRadius: '16px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Prioridad
            </button>
          </div>

          {(filterEstado !== 'todos' || filterCategoria !== 'todas' || filterSector !== 'todos' || busqueda) && (
            <button
              onClick={handleResetFilters}
              title="Restablecer filtros"
              style={{
                background: 'none',
                border: 'none',
                color: '#0057D9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <RotateCcw size={13} />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla Oficial de Figma: ID, Categoria, Tiempo, Estado, Sector, Acciones */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '13.5px',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid #E2E8F0',
                color: '#64748B',
                fontWeight: 600,
                fontSize: '13px',
                backgroundColor: '#F8FAFC',
              }}
            >
              <th style={{ padding: '14px 20px', width: '70px' }}>ID</th>
              <th style={{ padding: '14px 20px' }}>Categoría</th>
              <th style={{ padding: '14px 20px' }}>Tiempo</th>
              <th style={{ padding: '14px 20px' }}>Estado</th>
              <th style={{ padding: '14px 20px' }}>Sector</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', width: '140px' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredReportes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748B',
                  }}
                >
                  No se encontraron reportes con los filtros seleccionados
                </td>
              </tr>
            ) : (
              filteredReportes.map((rep, idx) => {
                const idDisplay = String(idx + 1).padStart(2, '0');
                const sectorDisplay = rep.id ? String((rep.id % 15) + 1) : '10';
                const isResuelto =
                  rep.estatus === EstatusReporte.Completado ||
                  rep.estatus === EstatusReporte.Cerrado ||
                  String(rep.estatus).toLowerCase().includes('resuelto');

                return (
                  <tr
                    key={rep.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* ID */}
                    <td
                      style={{
                        padding: '14px 20px',
                        color: '#64748B',
                        fontWeight: 600,
                      }}
                    >
                      {idDisplay}
                    </td>

                    {/* Categoría con Agente IA */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          onClick={() => onSelectReporte(rep.id)}
                          style={{
                            fontWeight: 600,
                            color: '#19244E',
                            cursor: 'pointer',
                          }}
                        >
                          {rep.categoria || rep.descripcion}
                        </span>
                        {rep.confianzaIA && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#F36B2E',
                              fontWeight: 700,
                              backgroundColor: '#FFF0E8',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            title={`Clasificado por IA: ${rep.categoria} (${Math.round(rep.confianzaIA * 100)}%)`}
                          >
                            <Sparkles size={11} color="#F36B2E" />
                            IA {Math.round(rep.confianzaIA * 100)}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tiempo */}
                    <td style={{ padding: '14px 20px', color: '#64748B', fontSize: '13px' }}>
                      {getTiempoTranscurrido(rep.fechaCreacion || rep.fechaRecibido)}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge estatus={rep.estatus} size="sm" />
                    </td>

                    {/* Sector */}
                    <td style={{ padding: '14px 20px', color: '#19244E', fontWeight: 600 }}>
                      {sectorDisplay}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                        }}
                      >
                        {/* Ver Seguimiento */}
                        <button
                          onClick={() => onSelectReporte(rep.id)}
                          title="Ver detalle del reporte"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#0057D9')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                        >
                          <Eye size={17} />
                        </button>

                        {/* Asignar Cuadrilla */}
                        <button
                          onClick={() => onOpenAsignarModal(rep)}
                          title="Asignar cuadrilla"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#F36B2E')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                        >
                          <UserPlus size={17} />
                        </button>

                        {/* Corregir Categoría IA */}
                        <button
                          onClick={() => onOpenCorregirModal(rep)}
                          title="Revisar o corregir categoría IA"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#253C96')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                        >
                          <Sparkles size={16} />
                        </button>

                        {/* Supervisión (RF-13) */}
                        {isResuelto && (
                          <button
                            onClick={() => onOpenSupervisionModal(rep)}
                            title="Programar visita de supervisión (RF-13)"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#22C55E',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ClipboardCheck size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
