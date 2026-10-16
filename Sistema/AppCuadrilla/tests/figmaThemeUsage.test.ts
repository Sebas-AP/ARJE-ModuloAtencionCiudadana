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

test('the detail route uses Figma tokens in an adaptive native layout', () => {
  const source = readFileSync(resolve(root, 'src/app/reporte/[id].tsx'), 'utf8');
  assert.match(source, /APP_THEME/);
  assert.match(source, /SafeAreaView/);
  assert.match(source, /ScrollView/);
  assert.doesNotMatch(source, /fitArtboard/);
  assert.doesNotMatch(source, /artboard/);
  assert.match(source, /Marcar ubicación/);
  assert.match(source, /¡Reporte completado!/);
  assert.match(source, /Confirmar supervisión/);
  assert.match(source, /Rechazar y reabrir/);
  assert.match(source, /onPress=\{\(\) => \{ void obtenerUbicacionActual\(\); \}\}/);
});

test('login, report search and report cards adapt instead of scaling a fixed artboard', () => {
  const login = readFileSync(resolve(root, 'src/app/(auth)/login.tsx'), 'utf8');
  const list = readFileSync(resolve(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  const card = readFileSync(resolve(root, 'src/components/ReporteCard.tsx'), 'utf8');
  for (const source of [login, list]) {
    assert.match(source, /SafeAreaView/);
    assert.doesNotMatch(source, /fitArtboard/);
    assert.doesNotMatch(source, /artboard/);
  }
  assert.match(card, /width: '100%'/);
  assert.doesNotMatch(card, /width: 375, height: 127/);
});

test('the audio overlay uses the Figma modal frame while clearly avoiding a fake recording state', () => {
  const source = readFileSync(resolve(root, 'src/components/EvidenciaUploader.tsx'), 'utf8');
  assert.match(source, /width: 332, height: 467/);
  assert.match(source, /width: 284, height: 229/);
  assert.match(source, /No hay grabación/);
  assert.match(source, /no puede capturar ni adjuntar audio/);
  assert.doesNotMatch(source, />Grabando \. \. \.</);
});
