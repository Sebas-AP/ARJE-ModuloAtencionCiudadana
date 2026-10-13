import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllowedNextStatuses, hasResolutionEvidence, canSelectAvailable, getOperationFeedback } from '../src/services/fieldUiPolicy.ts';

test('allowed next statuses only advances one operational step', () => {
  assert.deepEqual(getAllowedNextStatuses(2), [3]);
  assert.deepEqual(getAllowedNextStatuses(3), [4]);
  assert.deepEqual(getAllowedNextStatuses(4), [5]);
  for (const status of [0, 1, 5, 6, 7, 99]) assert.deepEqual(getAllowedNextStatuses(status), []);
});

test('completion requires resolution evidence for this report, not initial or rejected evidence', () => {
  const queued = { kind: 'evidence', reportId: 19, terminal: false } as const;
  assert.equal(hasResolutionEvidence(19, [{ tipo: 1 }], []), false);
  assert.equal(hasResolutionEvidence(19, [{ tipo: 2 }], []), true);
  assert.equal(hasResolutionEvidence(19, [], [queued]), true);
  assert.equal(hasResolutionEvidence(20, [], [queued]), false);
  assert.equal(hasResolutionEvidence(19, [], [{ ...queued, terminal: true }]), false);
});

test('available is blocked until active reports are known and absent', () => {
  assert.equal(canSelectAvailable(null), false);
  assert.equal(canSelectAvailable(1), false);
  assert.equal(canSelectAvailable(0), true);
});

test('operation feedback never calls pending, rejected or unauthorized writes synchronized', () => {
  const result = { sent: 1, pending: 0, failed: 0, requiresAuthentication: false };
  assert.equal(getOperationFeedback(result), 'synced');
  assert.equal(getOperationFeedback({ ...result, pending: 1 }), 'pending');
  assert.equal(getOperationFeedback({ ...result, pending: 1, failed: 1 }), 'rejected');
  assert.equal(getOperationFeedback({ ...result, pending: 1, requiresAuthentication: true }), 'authentication');
});
