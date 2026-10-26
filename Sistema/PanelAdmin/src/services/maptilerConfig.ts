export const MAPTILER_DEFAULT_MAP_ID = 'streets-v4';
export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">© MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>';

export interface MaptilerConfig {
  tileUrl: string;
  styleUrl: string;
  attribution: string;
  tileSize: 256;
}

export function isValidMaptilerMapId(mapId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(mapId);
}

export function createMaptilerConfig(
  key: string | undefined,
  mapId: string = MAPTILER_DEFAULT_MAP_ID,
): MaptilerConfig | null {
  const trimmedKey = key?.trim();
  if (!trimmedKey) return null;
  if (!isValidMaptilerMapId(mapId)) return null;

  const encodedKey = encodeURIComponent(trimmedKey);
  return {
    tileUrl: `https://api.maptiler.com/maps/${mapId}/256/{z}/{x}/{y}.png?key=${encodedKey}`,
    styleUrl: `https://api.maptiler.com/maps/${mapId}/style.json?key=${encodedKey}`,
    attribution: MAPTILER_ATTRIBUTION,
    tileSize: 256,
  };
}

export function getMaptilerConfigFromEnv(): MaptilerConfig | null {
  return createMaptilerConfig(
    import.meta.env.VITE_MAPTILER_API_KEY,
    import.meta.env.VITE_MAPTILER_MAP_ID || MAPTILER_DEFAULT_MAP_ID,
  );
}
