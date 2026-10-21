import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ReporteDTO, CuadrillaDTO, EstatusReporte } from '../types';
import { StatusBadge } from './StatusBadge';
import { CategoriaBadge } from './CategoriaBadge';

// Configuración de iconos personalizados con SVG
function createReportIcon(estatus: EstatusReporte) {
  let color = '#EF4444'; // Red for Nuevo
  if (estatus === EstatusReporte.Asignado) color = '#3B82F6';
  else if (estatus === EstatusReporte.EnProceso || estatus === EstatusReporte.LevantandoInformacion) color = '#F97316';
  else if (estatus === EstatusReporte.Completado) color = '#10B981';
  else if (estatus === EstatusReporte.EnSupervision) color = '#8B5CF6';
  else if (estatus === EstatusReporte.Cerrado) color = '#64748B';

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
      </filter>
      <path filter="url(#shadow)" fill="${color}" stroke="#FFFFFF" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3.2" fill="#FFFFFF"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-leaflet-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

function createCrewIcon() {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="36" height="36">
      <filter id="cshadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <circle cx="16" cy="16" r="14" fill="#253C96" stroke="#FFFFFF" stroke-width="2" filter="url(#cshadow)"/>
      <path fill="#FFFFFF" d="M22 17h-1v-3.5c0-.83-.67-1.5-1.5-1.5h-5.5V10h-2v2H8c-.55 0-1 .45-1 1v7c0 .55.45 1 1 1h1.18c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2h4.36c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2H25v-3l-3-4zm-10 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-7-7v2H8v-2h5zm6 2h-4v-2h3.5l1.5 2z"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-crew-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

interface MapViewProps {
  reportes?: ReporteDTO[];
  cuadrillas?: CuadrillaDTO[];
  crewPositions?: { idCuadrilla: number; lat: number; lng: number; nombre: string; fecha?: string }[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onSelectReporte?: ((reporte: any) => void);
  showRouteLine?: boolean;
}

// Helper para recentrar el mapa cuando cambian coordenadas
function RecenterMap({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

const DEFAULT_CUADRILLA_COORDS: Record<number, [number, number]> = {
  1: [21.912, -102.298], // Norte
  2: [21.882, -102.296], // Centro
  3: [21.878, -102.265], // Oriente
  4: [21.849, -102.305], // Sur
  5: [21.890, -102.330], // Poniente
};

export const MapView: React.FC<MapViewProps> = ({
  reportes = [],
  cuadrillas = [],
  crewPositions = [],
  center = [21.8853, -102.2916], // Aguascalientes Centro
  zoom = 13,
  height = '400px',
  onSelectReporte,
  showRouteLine = false,
}) => {
  // Usar solo posiciones reales de crewPositions, sin fallback a coordenadas fabricadas
  const effectiveCrews = crewPositions.filter(p => p.lat && p.lng);
  const crewsWithoutPosition = cuadrillas.filter(c => 
    !crewPositions.some(p => p.idCuadrilla === c.id)
  );

  return (
    <div
      style={{
        height,
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        position: 'relative',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <RecenterMap center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de Reportes */}
        {reportes.map((rep) => {
          if (!rep.latitud || !rep.longitud) return null;
          return (
            <Marker
              key={`rep-${rep.id}`}
              position={[rep.latitud, rep.longitud]}
              icon={createReportIcon(rep.estatus)}
            >
              <Popup>
                <div style={{ minWidth: '220px', padding: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#253C96', fontSize: '14px' }}>
                      {rep.folio || `Reporte #${rep.id}`}
                    </strong>
                    <StatusBadge estatus={rep.estatus} size="sm" />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <CategoriaBadge
                      categoria={rep.categoria}
                      tipoProblema={rep.tipoProblema}
                      confianzaIA={rep.confianzaIA}
                      size="sm"
                    />
                  </div>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#334155',
                      marginBottom: '8px',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {rep.descripcion}
                  </p>

                  {rep.cuadrillaAsignadaNombre && (
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '8px' }}>
                      👷 <strong>Cuadrilla:</strong> {rep.cuadrillaAsignadaNombre}
                    </div>
                  )}

                  {onSelectReporte && (
                    <button
                      onClick={() => onSelectReporte(rep)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        backgroundColor: '#253C96',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      Ver Seguimiento
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marcadores de Cuadrillas con posición real */}
        {effectiveCrews.map((crew) => (
          <Marker
            key={`crew-${crew.idCuadrilla}`}
            position={[crew.lat, crew.lng]}
            icon={createCrewIcon()}
          >
            <Popup>
              <div style={{ padding: '4px', fontSize: '12.5px' }}>
                <strong style={{ color: '#253C96', display: 'block', marginBottom: '4px' }}>
                  🚜 {crew.nombre}
                </strong>
                <span style={{ color: '#059669', fontWeight: 600 }}>Unidad en Operación</span>
                <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '11px' }}>
                  GPS: {crew.lat.toFixed(4)}, {crew.lng.toFixed(4)}
                  {crew.fecha && (
                    <>
                      <br/>Última actualización: {new Date(crew.fecha).toLocaleString('es-MX')}
                    </>
                  )}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Indicador de cuadrillas sin posición GPS */}
        {crewsWithoutPosition.length > 0 && (
          <div style={{ 
            position: 'absolute', 
            bottom: '20px', 
            left: '20px', 
            zIndex: 100,
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid #FED7AA',
            fontSize: '12px',
            color: '#9A3412',
          }}>
            <strong>⚠ Cuadrillas sin GPS:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
              {crewsWithoutPosition.map(c => (
                <li key={c.id} style={{ fontSize: '11px' }}>{c.nombre}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Línea de ruta si hay un reporte y una cuadrilla con posición */}
        {showRouteLine && reportes.length === 1 && effectiveCrews.length === 1 && (
          <Polyline
            positions={[
              [reportes[0].latitud, reportes[0].longitud],
              [effectiveCrews[0].lat, effectiveCrews[0].lng],
            ]}
            pathOptions={{ color: '#253C96', dashArray: '6, 8', weight: 3, opacity: 0.8 }}
          />
        )}
      </MapContainer>
    </div>
  );
};
