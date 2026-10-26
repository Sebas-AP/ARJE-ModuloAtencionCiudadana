import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ReporteDTO, CuadrillaDTO, EstatusReporte } from '../types';
import type { CrewMapPosition } from '../types/ubicaciones';
import { StatusBadge } from './StatusBadge';
import { CategoriaBadge } from './CategoriaBadge';
import { getMaptilerConfigFromEnv } from '../services/maptilerConfig';
import { isValidCoordinatePair } from '../services/ubicacionesModel';

function formatLocationTime(fechaHora: string): string {
  const date = new Date(fechaHora);
  return Number.isNaN(date.getTime()) ? 'Hora no disponible' : date.toLocaleString('es-MX');
}

function createReportIcon(estatus: EstatusReporte) {
  let color = '#EF4444';
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

function createCrewIcon(reciente: boolean) {
  const fill = reciente ? '#253C96' : '#94A3B8';
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="36" height="36" opacity="${reciente ? '1' : '0.75'}">
      <filter id="cshadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <circle cx="16" cy="16" r="14" fill="${fill}" stroke="#FFFFFF" stroke-width="2" filter="url(#cshadow)"/>
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

export interface MapFocusTarget {
  latitud: number;
  longitud: number;
  requestId: number;
}

interface MapViewProps {
  reportes?: ReporteDTO[];
  cuadrillas?: CuadrillaDTO[];
  crewPositions?: CrewMapPosition[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onSelectReporte?: (reporteId: number) => void;
  showRouteLine?: boolean;
  focusTarget?: MapFocusTarget;
}

const DEFAULT_CENTER: [number, number] = [21.8853, -102.2916];

function RecenterMap({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  const [latitud, longitud] = center;
  useEffect(() => {
    map.setView([latitud, longitud], zoom || map.getZoom());
  }, [latitud, longitud, zoom, map]);
  return null;
}

function FocusMap({ target }: { target?: MapFocusTarget }) {
  const map = useMap();
  const lastRequestId = useRef<number | null>(null);
  useEffect(() => {
    if (!target || lastRequestId.current === target.requestId) return;
    lastRequestId.current = target.requestId;
    map.flyTo([target.latitud, target.longitud], map.getZoom(), { animate: true });
  }, [target, map]);
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  reportes = [],
  cuadrillas = [],
  crewPositions = [],
  center = DEFAULT_CENTER,
  zoom = 13,
  height = '400px',
  onSelectReporte,
  showRouteLine = false,
  focusTarget,
}) => {
  const maptilerConfig = useMemo(() => getMaptilerConfigFromEnv(), []);
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);

  const visibleReportes = reportes.filter((reporte) =>
    isValidCoordinatePair(reporte.latitud, reporte.longitud));
  const effectiveCrews = crewPositions.filter((crew) =>
    isValidCoordinatePair(crew.lat, crew.lng));
  const crewsWithoutPosition = cuadrillas.filter(
    (cuadrilla) => !effectiveCrews.some((crew) => crew.idCuadrilla === cuadrilla.id),
  );
  const retryTiles = () => {
    setTileError(false);
    setTileAttempt((attempt) => attempt + 1);
  };

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
        style={{ height: '100%', width: '100%', backgroundColor: '#E2E8F0' }}
        scrollWheelZoom={true}
      >
        <RecenterMap center={center} zoom={zoom} />
        <FocusMap target={focusTarget} />
        {maptilerConfig && (
          <TileLayer
            key={`${maptilerConfig.tileUrl}-${tileAttempt}`}
            attribution={maptilerConfig.attribution}
            url={maptilerConfig.tileUrl}
            tileSize={maptilerConfig.tileSize}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
        )}

        {visibleReportes.map((rep) => (
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
                    onClick={() => onSelectReporte(rep.id)}
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
        ))}

        {effectiveCrews.map((crew) => (
          <Marker
            key={`crew-${crew.idCuadrilla}`}
            position={[crew.lat, crew.lng]}
            icon={createCrewIcon(crew.reciente)}
          >
            <Popup>
              <div style={{ padding: '4px', fontSize: '12.5px' }}>
                <strong style={{ color: '#253C96', display: 'block', marginBottom: '4px' }}>
                  🚜 {crew.nombre}
                </strong>
                <span style={{ color: crew.reciente ? '#059669' : '#B45309', fontWeight: 600 }}>
                  {crew.reciente ? 'Ubicación reciente' : 'Ubicación desactualizada'}
                </span>
                <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '11px' }}>
                  Reporte: {crew.folioReporte || `#${crew.idReporte}`}
                  <br />GPS: {crew.lat.toFixed(4)}, {crew.lng.toFixed(4)}
                  {crew.precisionMetros !== null && <><br />Precisión: ±{crew.precisionMetros.toFixed(0)} m</>}
                  <br />Última actualización: {formatLocationTime(crew.fechaHora)}
                </p>
                {onSelectReporte && (
                  <button
                    onClick={() => onSelectReporte(crew.idReporte)}
                    style={{
                      width: '100%', marginTop: '8px', padding: '5px 8px',
                      backgroundColor: '#253C96', color: '#FFFFFF', border: 'none',
                      borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Ver reporte
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {showRouteLine && visibleReportes.length === 1 && effectiveCrews.length === 1 && (
          <Polyline
            positions={[
              [visibleReportes[0].latitud, visibleReportes[0].longitud],
              [effectiveCrews[0].lat, effectiveCrews[0].lng],
            ]}
            pathOptions={{ color: '#253C96', dashArray: '6, 8', weight: 3, opacity: 0.8 }}
          />
        )}
      </MapContainer>

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

      {showRouteLine && (
        <div style={{
          position: 'absolute', top: '12px', right: '12px', zIndex: 500,
          backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: '6px',
          padding: '4px 8px', fontSize: '11px', color: '#475569',
          border: '1px solid #E2E8F0',
        }}>
          Línea de referencia
        </div>
      )}

      {(tileError || !maptilerConfig) && (
        <div style={{
          position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 600, backgroundColor: 'rgba(127,29,29,0.94)', color: '#FFFFFF',
          borderRadius: '8px', padding: '8px 12px', fontSize: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span>{!maptilerConfig ? 'Mapa no disponible: falta la clave MapTiler.' : 'No se pudieron cargar los mapas.'}</span>
          <button
            onClick={retryTiles}
            style={{
              border: '1px solid rgba(255,255,255,0.6)', background: 'transparent',
              color: '#FFFFFF', borderRadius: '5px', padding: '2px 7px',
              fontSize: '11px', cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
};
