import type { QueuedOperation } from './offlineQueue';

type LocationOperation = Extract<QueuedOperation, { kind: 'location' }>;
type StatusOperation = Extract<QueuedOperation, { kind: 'status' }>;
type EstimateOperation = Extract<QueuedOperation, { kind: 'estimate' }>;
type ResolutionCommentOperation = Extract<QueuedOperation, { kind: 'resolutionComment' }>;
type SupervisionResultOperation = Extract<QueuedOperation, { kind: 'supervisionResult' }>;
type EvidenceOperation = Extract<QueuedOperation, { kind: 'evidence' }>;
type AvailabilityOperation = Extract<QueuedOperation, { kind: 'availability' }>;

export interface LocationBatch {
  reportId: number;
  ownerCuadrillaId: number;
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
    getActiveOwner(): number | null;
    list(): Promise<QueuedOperation[]>;
    markFailed(id: string, lastError: string, terminal: boolean): Promise<void>;
    removeConfirmed(id: string): Promise<void>;
  };
  sendLocations(batch: LocationBatch): Promise<unknown>;
  sendStatus(operation: StatusOperation): Promise<unknown>;
  sendEstimate(operation: EstimateOperation): Promise<unknown>;
  sendResolutionComment(operation: ResolutionCommentOperation): Promise<unknown>;
  sendSupervisionResult(operation: SupervisionResultOperation): Promise<unknown>;
  sendEvidence(operation: EvidenceOperation): Promise<unknown>;
  sendAvailability(operation: AvailabilityOperation): Promise<unknown>;
}

interface ActiveSync {
  current: Promise<SyncResult>;
  ownerCuadrillaId: number | null;
}

const activeSyncs = new WeakMap<SyncDependencies['queue'], ActiveSync>();

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
  const message = errorMessage(error);
  const match = /^API Error (\d{3})(?::|\b)/.exec(message);
  return match ? Number(match[1]) : undefined;
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error);
}

async function sendGroup(group: QueuedOperation[], dependencies: SyncDependencies): Promise<void> {
  const first = group[0];
  switch (first.kind) {
    case 'location':
      await dependencies.sendLocations({
        reportId: first.reportId,
        ownerCuadrillaId: first.ownerCuadrillaId,
        ubicaciones: group.map((operation) => {
          const point = operation as LocationOperation;
          return { latitud: point.latitud, longitud: point.longitud };
        }),
      });
      return;
    case 'status':
      await dependencies.sendStatus(first);
      return;
    case 'estimate':
      await dependencies.sendEstimate(first);
      return;
    case 'resolutionComment':
      await dependencies.sendResolutionComment(first);
      return;
    case 'supervisionResult':
      await dependencies.sendSupervisionResult(first);
      return;
    case 'evidence':
      await dependencies.sendEvidence(first);
      return;
    case 'availability':
      await dependencies.sendAvailability(first);
      return;
  }
}

async function runSync(
  dependencies: SyncDependencies,
  ownerCuadrillaId: number | null,
  onSnapshot: (operations: QueuedOperation[]) => void = () => {},
): Promise<SyncResult> {
  const blockedReports = new Set<number>();
  let sent = 0;
  let requiresAuthentication = false;
  const operations = await dependencies.queue.list();
  onSnapshot(operations);

  for (const group of groupLocations(operations)) {
    const first = group[0];
    if (ownerCuadrillaId === null
      || first.ownerCuadrillaId !== ownerCuadrillaId
      || dependencies.queue.getActiveOwner() !== ownerCuadrillaId) break;
    if (first.terminal) {
      if (first.kind === 'status' || first.kind === 'resolutionComment') blockedReports.add(first.reportId);
      continue;
    }
    if ('reportId' in first && blockedReports.has(first.reportId)) continue;

    try {
      await sendGroup(group, dependencies);
    } catch (error) {
      if (dependencies.queue.getActiveOwner() !== ownerCuadrillaId) break;
      const status = errorStatus(error);
      if (status === 401 || status === 403) {
        for (const operation of group) await dependencies.queue.markFailed(operation.id, errorMessage(error), false);
        requiresAuthentication = true;
        break;
      }
      const terminal = status === 400 || status === 409;
      for (const operation of group) await dependencies.queue.markFailed(operation.id, errorMessage(error), terminal);
      if (!terminal) break;
      if (first.kind === 'status' || first.kind === 'resolutionComment') blockedReports.add(first.reportId);
      continue;
    }
    if (dependencies.queue.getActiveOwner() !== ownerCuadrillaId) break;
    for (const operation of group) await dependencies.queue.removeConfirmed(operation.id);
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

async function runRequestedSyncs(dependencies: SyncDependencies): Promise<SyncResult> {
  let result!: SyncResult;
  let hasUnprocessedOperations: boolean;
  const ownerCuadrillaId = dependencies.queue.getActiveOwner();
  do {
    let processedIds = new Set<string>();
    result = await runSync(dependencies, ownerCuadrillaId, (operations) => {
      processedIds = new Set(operations.map((operation) => operation.id));
    });
    if (dependencies.queue.getActiveOwner() !== ownerCuadrillaId) return result;
    const remaining = await dependencies.queue.list();
    hasUnprocessedOperations = remaining.some((operation) => !processedIds.has(operation.id));
  } while (hasUnprocessedOperations);
  return result;
}

export function syncPendingOperations(dependencies: SyncDependencies): Promise<SyncResult> {
  const active = activeSyncs.get(dependencies.queue);
  if (active) {
    return active.ownerCuadrillaId === dependencies.queue.getActiveOwner()
      ? active.current
      : active.current.then(() => syncPendingOperations(dependencies));
  }

  const next = { ownerCuadrillaId: dependencies.queue.getActiveOwner() } as ActiveSync;
  const current = runRequestedSyncs(dependencies);
  next.current = current;
  activeSyncs.set(dependencies.queue, next);
  const clear = () => {
    if (activeSyncs.get(dependencies.queue) === next) activeSyncs.delete(dependencies.queue);
  };
  void current.then(clear, clear);
  return current;
}
