import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('the tab layout and both map implementations use the shared AppCuadrilla theme', () => {
  for (const file of ['src/app/(tabs)/_layout.tsx', 'src/components/MapaScreen.native.tsx', 'src/components/MapaScreen.web.tsx']) {
    assert.match(readFileSync(resolve(root, file), 'utf8'), /APP_THEME/);
  }
});

test('the detail route reproduces the Figma frames and exposes completion and location actions', () => {
  const source = readFileSync(resolve(root, 'src/app/reporte/[id].tsx'), 'utf8');
  assert.match(source, /width: 412, height: 917/);
  assert.match(source, /top: 154, width: 412, height: 231/);
  assert.match(source, /width: 375, height: 159/);
  assert.match(source, /top: 835, width: 357, height: 44/);
  assert.match(source, /Marcar ubicación/);
  assert.match(source, /¡Reporte completado!/);
  assert.match(source, /reporte\.estatus === 5 \|\| reporte\.estatus === 6 \|\| reporte\.estatus === 7/);
  assert.match(source, /onPress=\{\(\) => \{ void obtenerUbicacionActual\(\); \}\}/);
});

test('login, report search and report cards retain the Figma artboard coordinates', () => {
  const login = readFileSync(resolve(root, 'src/app/(auth)/login.tsx'), 'utf8');
  const list = readFileSync(resolve(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  const card = readFileSync(resolve(root, 'src/components/ReporteCard.tsx'), 'utf8');
  assert.match(login, /left: 74, top: 164, width: 265, height: 115/);
  assert.match(login, /usernameGroup: \{ top: 413 \}/);
  assert.match(login, /passwordGroup: \{ top: 513 \}/);
  assert.match(login, /left: 40, top: 735, width: 332, height: 48/);
  assert.match(list, /top: 72, height: 29/);
  assert.match(list, /left: 24, top: 140, width: 361, height: 33/);
  assert.match(list, /top: 248, left: 20, width: 371, height: 1/);
  assert.match(card, /width: 375, height: 127/);
});

test('the audio overlay uses the Figma modal frame while clearly avoiding a fake recording state', () => {
  const source = readFileSync(resolve(root, 'src/components/EvidenciaUploader.tsx'), 'utf8');
  assert.match(source, /width: 332, height: 467/);
  assert.match(source, /width: 284, height: 229/);
  assert.match(source, /No hay grabación/);
  assert.match(source, /no puede capturar ni adjuntar audio/);
  assert.doesNotMatch(source, />Grabando \. \. \.</);
});
