import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDirectionsUrl } from '../src/services/navigation.ts';

test('usa Apple Maps en iOS', () => {
  assert.equal(buildDirectionsUrl(19.4326, -99.1332, 'ios'), 'maps:0,0?q=19.4326,-99.1332');
});

test('usa Google Maps en Android y web', () => {
  assert.equal(
    buildDirectionsUrl(19.4326, -99.1332, 'android'),
    'https://www.google.com/maps/dir/?api=1&destination=19.4326,-99.1332',
  );
  assert.equal(
    buildDirectionsUrl(19.4326, -99.1332, 'web'),
    'https://www.google.com/maps/dir/?api=1&destination=19.4326,-99.1332',
  );
});
