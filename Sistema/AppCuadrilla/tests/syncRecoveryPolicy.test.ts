import assert from 'node:assert/strict';
import test from 'node:test';
import { getTerminalOperationDetails, getRecoverableOperationCount } from '../src/services/syncRecoveryPolicy.ts';

test('terminal operations expose their stored rejection reason and a discard-only recovery action', () => {
  const operations = [
    { id: 'rejected', kind: 'evidence', reportId: 19, terminal: true, lastError: 'La evidencia ya no está disponible.' },
    { id: 'pending', kind: 'status', reportId: 19, terminal: false },
  ];

  assert.deepEqual(getTerminalOperationDetails(operations), [{
    id: 'rejected',
    description: 'Evidencia del reporte #19',
    error: 'La evidencia ya no está disponible.',
  }]);
  assert.equal(getRecoverableOperationCount(operations), 1);
});

test('terminal operations without an API message still provide a safe explanation', () => {
  assert.deepEqual(getTerminalOperationDetails([
    { id: 'rejected', kind: 'availability', terminal: true },
  ]), [{
    id: 'rejected',
    description: 'Cambio de disponibilidad',
    error: 'El servidor rechazó esta operación. Descártala antes de registrar un nuevo cambio.' ,
  }]);
  assert.equal(getRecoverableOperationCount([{ id: 'rejected', kind: 'availability', terminal: true }]), 0);
});

test('terminal field-workflow operations identify the action that was rejected', () => {
  assert.deepEqual(getTerminalOperationDetails([
    { id: 'estimate', kind: 'estimate', reportId: 19, terminal: true },
    { id: 'supervision', kind: 'supervisionResult', reportId: 20, terminal: true },
  ]), [
    {
      id: 'estimate',
      description: 'Tiempo estimado del reporte #19',
      error: 'El servidor rechazó esta operación. Descártala antes de registrar un nuevo cambio.',
    },
    {
      id: 'supervision',
      description: 'Resultado de supervisión del reporte #20',
      error: 'El servidor rechazó esta operación. Descártala antes de registrar un nuevo cambio.',
    },
  ]);
});
