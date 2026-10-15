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
