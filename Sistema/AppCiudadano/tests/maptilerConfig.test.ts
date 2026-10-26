import assert from 'node:assert/strict';
import test from 'node:test';
import { createMaptilerConfig } from '../src/services/maptilerConfig.ts';

test('crea URLs raster y vectoriales con la key codificada', () => {
  const config = createMaptilerConfig('clave de prueba/+=', 'streets-v4');
  assert.ok(config);
  assert.equal(
    config.tileUrl,
    'https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=clave%20de%20prueba%2F%2B%3D',
  );
  assert.equal(
    config.styleUrl,
    'https://api.maptiler.com/maps/streets-v4/style.json?key=clave%20de%20prueba%2F%2B%3D',
  );
  assert.equal(config.tileSize, 256);
  assert.match(config.attribution, /MapTiler/);
  assert.match(config.attribution, /OpenStreetMap/);
});

test('usa streets-v4 por defecto', () => {
  const config = createMaptilerConfig('abc');
  assert.ok(config);
  assert.match(config.tileUrl, /\/maps\/streets-v4\/256\//);
  assert.match(config.styleUrl, /\/maps\/streets-v4\/style\.json/);
});

test('sin key o con espacios devuelve null', () => {
  assert.equal(createMaptilerConfig(undefined), null);
  assert.equal(createMaptilerConfig(''), null);
  assert.equal(createMaptilerConfig('   '), null);
});

test('rechaza mapId con segmentos, query o host', () => {
  assert.equal(createMaptilerConfig('abc', 'otro/mapa'), null);
  assert.equal(createMaptilerConfig('abc', 'mapa?x=1'), null);
  assert.equal(createMaptilerConfig('abc', 'https://api.maptiler.com'), null);
  assert.equal(createMaptilerConfig('abc', 'host:8080'), null);
  assert.equal(createMaptilerConfig('abc', 'mapa#fragmento'), null);
});
