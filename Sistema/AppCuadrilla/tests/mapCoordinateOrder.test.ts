import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// MapLibre GL (native) and Leaflet (web) expect the OPPOSITE tuple order
// ([lng, lat] vs [lat, lng]). Both files sit side by side with mirror-image
// constants/expressions, which makes copy-pasting one into the other an easy
// mistake — this guards against that regression at the source-text level,
// since there is no component-rendering harness in this test setup.

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');

const nativeSource = read('../src/components/MapaScreen.native.tsx');
const webMarkersSource = read('../src/components/AssignedReportsMap.web.tsx');

test('MapLibre (nativo) construye las coordenadas como [longitud, latitud]', () => {
  assert.match(nativeSource, /lngLat=\{\[marker\.longitud, marker\.latitud\]\}/);
  assert.match(nativeSource, /lngLat=\{\[userLocation\.longitude, userLocation\.latitude\]\}/);
  assert.match(nativeSource, /center: \[longitude, latitude\]/);
  assert.match(nativeSource, /DEFAULT_CENTER: \[number, number\] = \[-102\.5528, 23\.6345\]/);
});

test('Leaflet (web) construye las coordenadas como [latitud, longitud]', () => {
  assert.match(webMarkersSource, /position=\{\[marker\.latitud, marker\.longitud\]\}/);
  assert.match(webMarkersSource, /\[ownLocation\.latitude, ownLocation\.longitude\]/);
  assert.match(webMarkersSource, /flyTo\(\[request\.latitud, request\.longitud\]/);
});
