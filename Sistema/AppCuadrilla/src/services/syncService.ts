import type { QueuedOperation } from './offlineQueue';

type LocationOperation = Extract<QueuedOperation, { kind: 'location' }>;
type StatusOperation = Extract<QueuedOperation, { kind: 'status' }>;
type EvidenceOperation = Extract<QueuedOperation, { kind: 'evidence' }>;
type AvailabilityOperation = Extract<QueuedOperation, { kind: 'availability' }>;

export interface LocationBatch {
  reportId: number;
  ubicaciones: { latitud: number; longitud: number }[];
}

export interface SyncResult {
  sent: number;
  pending: number;
  failed: number;
  requiresAuthentication: boolean;
}

export interface SyncDependencies {
  queue: {
    list(): Promise<QueuedOperation[]>;
    markFailed(id: string, lastError: string, terminal: boolean): Promise<void>;
    remove(id: string): Promise<void>;
  };
  sendLocations(batch: LocationBatch): Promise<unknown>;
  sendStatus(operation: StatusOperation): Promise<unknown>;
  sendEvidence(operation: EvidenceOperation): Promise<unknown>;
  sendAvailability(operation: AvailabilityOperation): Promise<unknown>;
}

const activeSyncs = new WeakMap<SyncDependencies['queue'], Promise<SyncResult>>();

export function groupLocations(items: QueuedOperation[]): QueuedOperation[][] {
  const groups: QueuedOperation[][] = [];
  for (const item of items) {
    const previous = groups[groups.length - 1];
    if (item.kind === 'location' && !item.terminal && previous?.[0]?.kind === 'location'
      && !previous[0].terminal && previous[0].reportId === item.reportId) {
      previous.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: unknown; response?: { status?: unknown } };
    const status = candidate.status ?? candidate.response?.status;
    if (typeof status === 'number') return status;
  }
  const message = error instanceof Error ? error.message : String(error);
  const match = /^API Error (\d{3})(?::|\b)/.exec(message);
  return match ? Number(match[1]) : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function sendGroup(group: QueuedOperation[], dependencies: SyncDependencies): Promise<void> {
  const first = group[0];
  switch (first.kind) {
    case 'location':
      await dependencies.sendLocations({
        reportId: first.reportId,
        ubicaciones: group.map((operation) => {
          const point = operation as LocationOperation;
          return { latitud: point.latitud, longitud: point.longitud };
        }),
      });
      return;
    case 'status':
      await dependencies.sendStatus(first);
      return;
    case 'evidence':
      await dependencies.sendEvidence(first);
      return;
    case 'availability':
      await dependencies.sendAvailability(first);
      return;
  }
}

async function runSync(dependencies: SyncDependencies): Promise<SyncResult> {
  const blockedReports = new Set<number>();
  let sent = 0;
  let requiresAuthentication = false;

  for (const group of groupLocations(await dependencies.queue.list())) {
    const first = group[0];
    if (first.terminal) {
      if (first.kind === 'status') blockedReports.add(first.reportId);
      continue;
    }
    if ('reportId' in first && blockedReports.has(first.reportId)) continue;

    try {
      await sendGroup(group, dependencies);
    } catch (error) {
      const status = errorStatus(error);
      if (status === 401 || status === 403) {
        for (const operation of group) await dependencies.queue.markFailed(operation.id, errorMessage(error), false);
        requiresAuthentication = true;
        break;
      }
      const terminal = status === 400 || status === 409;
      for (const operation of group) await dependencies.queue.markFailed(operation.id, errorMessage(error), terminal);
      if (!terminal) break;
      if (first.kind === 'status') blockedReports.add(first.reportId);
      continue;
    }
    for (const operation of group) await dependencies.queue.remove(operation.id);
    sent += group.length;
  }

  const remaining = await dependencies.queue.list();
  return {
    sent,
    pending: remaining.length,
    failed: remaining.filter((operation) => operation.terminal).length,
    requiresAuthentication,
  };
}

export function syncPendingOperations(dependencies: SyncDependencies): Promise<SyncResult> {
  const active = activeSyncs.get(dependencies.queue);
  if (active) return active;

  const current = runSync(dependencies);
  activeSyncs.set(dependencies.queue, current);
  const clear = () => {
    if (activeSyncs.get(dependencies.queue) === current) activeSyncs.delete(dependencies.queue);
  };
  void current.then(clear, clear);
  return current;
}
