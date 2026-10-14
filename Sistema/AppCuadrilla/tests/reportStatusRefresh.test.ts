import assert from 'node:assert/strict';
import test from 'node:test';
import { mobileRuntime } from './helpers/mobileRuntime.ts';

test('detail reconciles its successful status while another report remains terminal', async () => {
  const app = mobileRuntime();
  const operations = app.load('fieldOperationsService');
  const policy = app.load('fieldUiPolicy');
  const rejected = await operations.fieldOperationQueue.enqueue({ kind: 'status', reportId: 20, status: 3 });
  await operations.fieldOperationQueue.markFailed(rejected.id, 'API Error 409', true);
  await operations.fieldOperationQueue.enqueue({ kind: 'status', reportId: 19, status: 3 });
  let detailStatus = 2;
  let release!: () => void;
  const detailGate = new Promise<void>((resolve) => { release = resolve; });
  app.respondWith(async (url) => {
    if (url.endsWith('/reportes/19/estatus')) return { ok: true, status: 204 };
    assert.equal(url.endsWith('/reportes/19'), true);
    await detailGate;
    return { ok: true, status: 200, json: async () => ({ id: 19, estatus: 3 }) };
  });
  const reload = async () => {
    detailStatus = (await app.load('reportesService').reportesService.getDetalle(19)).estatus;
    return true;
  };

  assert.equal(await policy.refreshReportAfterStatus(19, app.pending(), reload), false);
  assert.equal(app.requests.length, 0, 'current pending status must keep the old detail blocked');
  const result = await operations.syncFieldOperations();
  assert.equal(result.sent, 1);
  assert.equal(policy.getOperationFeedback(result), 'rejected');
  assert.equal(app.pending().length, 1);

  let reconciled = false;
  const refreshing = policy.refreshReportAfterStatus(19, app.pending(), reload).then((value: boolean) => {
    reconciled = value;
  });
  await Promise.resolve();
  assert.equal(reconciled, false, 'a removed status alone must not unlock transitions before detail returns');
  assert.equal(detailStatus, 2);
  release();
  await refreshing;
  assert.equal(reconciled, true);
  assert.equal(detailStatus, 3);
  assert.deepEqual(Array.from(policy.getAllowedNextStatuses(detailStatus)), [4]);
  assert.equal(await policy.refreshReportAfterStatus(19, app.pending(), async () => false), false,
    'a failed detail load must keep transitions blocked');
  assert.equal(await policy.refreshReportAfterStatus(20, app.pending(), reload), false,
    'a terminal status for the current report must still block reconciliation');
});
