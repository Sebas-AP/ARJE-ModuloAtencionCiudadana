import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCATION_DISTANCE_INTERVAL_METERS,
  LOCATION_TIME_INTERVAL_MS,
  canTrackLocation,
  canTrackReportStatus,
  isTrackingSelectedReport,
} from '../src/services/locationTrackingPolicy.ts';

test('captures a sample every 30 seconds or 20 meters', () => {
  assert.equal(LOCATION_TIME_INTERVAL_MS, 30_000);
  assert.equal(LOCATION_DISTANCE_INTERVAL_METERS, 20);
});

test('tracks only reports in progress or under resolution', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(canTrackReportStatus), [
    false, false, true, true, false, false, false,
  ]);
  assert.equal(canTrackReportStatus(undefined), false);
});

test('tracking requires permissions, an active assignment, and the same session owner', () => {
  const valid = {
    reportStatus: 3,
    foregroundPermission: true,
    backgroundPermission: true,
    ownerCuadrillaId: 8,
    sessionOwnerCuadrillaId: 8,
    assignmentActive: true,
  };

  assert.equal(canTrackLocation(valid), true);
  assert.equal(canTrackLocation({ ...valid, reportStatus: 5 }), false);
  assert.equal(canTrackLocation({ ...valid, foregroundPermission: false }), false);
  assert.equal(canTrackLocation({ ...valid, backgroundPermission: false }), false);
  assert.equal(canTrackLocation({ ...valid, assignmentActive: false }), false);
  assert.equal(canTrackLocation({ ...valid, ownerCuadrillaId: 9 }), false);
  assert.equal(canTrackLocation({ ...valid, sessionOwnerCuadrillaId: null }), false);
});

test('a hook only reports tracking for the report it currently shows', () => {
  const tracking = { reportId: 19, ownerCuadrillaId: 8 };
  assert.equal(isTrackingSelectedReport(tracking, 19), true);
  assert.equal(isTrackingSelectedReport(tracking, 20), false);
  assert.equal(isTrackingSelectedReport(null, 19), false);
  assert.equal(isTrackingSelectedReport(tracking, undefined), false);
});
