import React, { useState } from 'react';
import { Eye, ArrowLeft, MapPin, User, Plus, Truck } from 'lucide-react';
import { CuadrillaDTO, ReporteDTO, EstatusCuadrilla } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapView';
import { UserBlobatar } from '../components/UserBlobatar';

interface CuadrillasScreenProps {
  cuadrillas: CuadrillaDTO[];
  reportes: ReporteDTO[];
  onOpenNuevaCuadrillaModal: () => void;
  onToggleDisponibilidad: (cuadrillaId: number) => void;
  onViewReportesDeCuadrilla: (cuadrillaNombre: string) => void;
}

export const CuadrillasScreen: React.FC<CuadrillasScreenProps> = ({
  cuadrillas,
  reportes,
  onOpenNuevaCuadrillaModal,
  onToggleDisponibilidad,
  onViewReportesDeCuadrilla,
}) => {
  const [selectedCuadrilla, setSelectedCuadrilla] = useState<CuadrillaDTO | null>(null);

  // Cuadrillas activas e inactivas según el diseño de Figma
  const cuadrillasActivas = cuadrillas.filter(
    (c) => c.activo !== false && c.estatusDisponibilidad !== EstatusCuadrilla.FueraServicio
  );
  const cuadrillasInactivas = cuadrillas.filter(
    (c) => c.activo === false || c.estatusDisponibilidad === EstatusCuadrilla.FueraServicio
  );

  // Si hay una cuadrilla seleccionada, mostrar la pantalla de detalle de Figma ("Cuadrilla 1")
  if (selectedCuadrilla) {
    const reportesDeCuadrilla = reportes.filter(
      (r) =>
        r.idCuadrillaAsignada === selectedCuadrilla.id ||
        r.cuadrillaAsignadaNombre === selectedCuadrilla.nombre
    );

    // Parsear miembros
    const miembros: { nombre: string; cargo: string }[] = (() => {
      if (Array.isArray(selectedCuadrilla.integrantes)) {
        return selectedCuadrilla.integrantes.map((n: string) => ({
          nombre: n,
          cargo: 'Técnico Operativo',
        }));
      }
      if (typeof selectedCuadrilla.integrantes === 'string') {
        return selectedCuadrilla.integrantes.split(',').map((n: string, i: number) => ({
          nombre: n.trim(),
          cargo: i === 0 ? 'Líder de Cuadrilla' : 'Técnico Especialista',
        }));
      }
      return [
        { nombre: selectedCuadrilla.lider || 'Juan Pérez López', cargo: 'Líder de Cuadrilla' },
        { nombre: 'Carlos Rivas Sánchez', cargo: 'Técnico Fontanero' },
        { nombre: 'Pedro Ruiz Méndez', cargo: 'Operador de Maquinaria' },
      ];
    })();

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '10px 0',
        }}
      >
        {/* Encabezado con Volver y Nombre */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSelectedCuadrilla(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#0057D9',
                fontWeight: 700,
                fontSize: '13.5px',
              }}
            >
              <ArrowLeft size={16} />
              <span>Volver a cuadrillas</span>
            </button>

            <h2
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#19244E',
                margin: 0,
              }}
            >
              {selectedCuadrilla.nombre}
            </h2>
          </div>

          <button
            onClick={() => onToggleDisponibilidad(selectedCuadrilla.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: selectedCuadrilla.disponible ? '#F36B2E' : '#22C55E',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            {selectedCuadrilla.disponible ? 'Poner en mantenimiento' : 'Marcar disponible'}
          </button>
        </div>

        {/* 1. Reportes Asignados (Figma: chips con nombre y estado) */}
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#19244E',
              marginBottom: '12px',
            }}
          >
            Reportes asignados
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reportesDeCuadrilla.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  color: '#64748B',
                  fontSize: '13px',
                }}
              >
                Esta cuadrilla no tiene reportes activos asignados actualmente.
              </div>
            ) : (
              reportesDeCuadrilla.map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#19244E' }}>
                    {rep.categoria || rep.descripcion}
                  </span>
                  <StatusBadge estatus={rep.estatus} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Última Ubicación Registrada (Figma: Mapa) */}
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#19244E',
              marginBottom: '12px',
            }}
          >
            Última ubicación registrada
          </h3>

          <div
            style={{
              height: '240px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            }}
          >
            <MapView
              cuadrillas={[selectedCuadrilla]}
              reportes={reportesDeCuadrilla}
              height="240px"
            />
          </div>
        </div>

        {/* 3. Miembros de la Cuadrilla (Figma: Tarjetas con Icono, Nombre Apellido, Cargo) */}
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#19244E',
              marginBottom: '12px',
            }}
          >
            Miembros de la cuadrilla
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {miembros.map((m, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <UserBlobatar
                  name={m.nombre}
                  size={42}
                  isOnline={true}
                  showBorder={true}
                />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-dark-navy)' }}>
                    {m.nombre}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {m.cargo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista Principal de Cuadrillas de Figma: "Cuadrillas activas" y "Cuadrillas inactivas"
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '10px 0',
      }}
    >
      {/* Botón Superior para Registrar Nueva Cuadrilla */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onOpenNuevaCuadrillaModal}
          className="btn-primary"
          style={{
            padding: '9px 18px',
            fontSize: '13.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-orange)',
          }}
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>Registrar cuadrilla</span>
        </button>
      </div>

      {/* Sección 1: Cuadrillas activas (Figma) */}
      <div>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-dark-navy)',
            margin: '0 0 16px 0',
          }}
        >
          Cuadrillas activas
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cuadrillasActivas.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--color-text-muted)', backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
              No hay cuadrillas activas registradas.
            </div>
          ) : (
            cuadrillasActivas.map((cuad) => (
              <div
                key={cuad.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--color-dark-navy)',
                  }}
                >
                  {cuad.nombre}
                </span>

                {/* Botón Ojo Azul de Figma (#0057D9) con gradiente eléctrico */}
                <button
                  onClick={() => setSelectedCuadrilla(cuad)}
                  title={`Ver detalle de ${cuad.nombre}`}
                  style={{
                    width: '38px',
                    height: '38px',
                    background: 'var(--gradient-electric)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 87, 217, 0.28)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 87, 217, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 87, 217, 0.28)';
                  }}
                >
                  <Eye size={18} color="#FFFFFF" strokeWidth={2.2} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sección 2: Cuadrillas inactivas (Figma) */}
      <div>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-dark-navy)',
            margin: '0 0 16px 0',
          }}
        >
          Cuadrillas inactivas
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cuadrillasInactivas.length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--color-text-muted)',
                fontSize: '14px',
              }}
            >
              <span>Cuadrilla 6</span>
              <button
                style={{
                  width: '38px',
                  height: '38px',
                  background: 'var(--gradient-electric)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
              >
                <Eye size={18} color="#FFFFFF" strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            cuadrillasInactivas.map((cuad) => (
              <div
                key={cuad.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#64748B',
                  }}
                >
                  {cuad.nombre}
                </span>

                <button
                  onClick={() => setSelectedCuadrilla(cuad)}
                  title={`Ver detalle de ${cuad.nombre}`}
                  style={{
                    width: '38px',
                    height: '38px',
                    background: 'var(--gradient-electric)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 87, 217, 0.28)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 87, 217, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 87, 217, 0.28)';
                  }}
                >
                  <Eye size={18} color="#FFFFFF" strokeWidth={2.2} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
