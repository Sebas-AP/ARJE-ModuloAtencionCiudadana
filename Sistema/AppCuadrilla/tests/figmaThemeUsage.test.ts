import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
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

test('login uses the local ARJE brand asset instead of the design guide and keeps the Figma frame focused', () => {
  const login = readFileSync(resolve(root, 'src/app/(auth)/login.tsx'), 'utf8');
  const brandAsset = resolve(root, 'assets/arje-cuadrilla-logo.png');

  assert.ok(existsSync(brandAsset));
  assert.ok(statSync(brandAsset).size > 100_000);
  assert.match(login, /arje-cuadrilla-logo\.png/);
  assert.doesNotMatch(login, /Acceso de cuadrilla/);
  assert.doesNotMatch(login, /Ingresa para consultar y actualizar tus reportes asignados/);
});

test('report list and cards preserve the compact Figma proportions without fixed-width artboards', () => {
  const list = readFileSync(resolve(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  const card = readFileSync(resolve(root, 'src/components/ReporteCard.tsx'), 'utf8');

  assert.match(list, /paddingTop: 44/);
  assert.match(list, /minHeight: 43/);
  assert.match(list, /fontSize: 16, color: '#015FEB'/);
  assert.match(card, /minHeight: 127/);
  assert.match(card, /backgroundColor: '#E5E7EB'/);
});

test('detail, resolution and completion use the Figma mobile proportions while keeping the native flow adaptive', () => {
  const detail = readFileSync(resolve(root, 'src/app/reporte/[id].tsx'), 'utf8');

  assert.match(detail, /backgroundColor: '#F2F2F2'/);
  assert.match(detail, /minHeight: 231/);
  assert.match(detail, /marginHorizontal: -18/);
  assert.match(detail, /width: 157, height: 157, borderRadius: 78\.5/);
  assert.match(detail, /minHeight: 44, borderRadius: 12/);
  assert.match(detail, /ha sido marcado como completado con éxito/);
  assert.match(detail, /styles\.completeAction/);
});

test('the audio overlay uses the Figma modal frame while clearly avoiding a fake recording state', () => {
  const source = readFileSync(resolve(root, 'src/components/EvidenciaUploader.tsx'), 'utf8');
  assert.match(source, /width: 332, height: 467/);
  assert.match(source, /width: 284, height: 229/);
  assert.match(source, /No hay grabación/);
  assert.match(source, /no puede capturar ni adjuntar audio/);
  assert.doesNotMatch(source, />Grabando \. \. \.</);
});
