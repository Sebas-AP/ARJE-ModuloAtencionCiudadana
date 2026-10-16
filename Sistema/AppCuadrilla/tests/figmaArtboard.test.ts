import assert from 'node:assert/strict';
import test from 'node:test';
import { DESIGN_ARTBOARD, fitArtboard } from '../src/theme/figmaArtboard.ts';

test('uses the Figma mobile frame as a uniform, centered 412×917 artboard', () => {
  assert.deepEqual(DESIGN_ARTBOARD, { width: 412, height: 917 });
  assert.equal(fitArtboard(412, 917), 1);
  assert.equal(fitArtboard(206, 458.5), 0.5);
  assert.equal(fitArtboard(412, 800), 800 / 917);
});
