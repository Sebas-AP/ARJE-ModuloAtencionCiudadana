export function buildDirectionsUrl(latitud: number, longitud: number, platformOS: string): string {
  if (platformOS === 'ios') return `maps:0,0?q=${latitud},${longitud}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
}
