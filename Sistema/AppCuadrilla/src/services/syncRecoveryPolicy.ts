type OperationForRecovery = {
  id: string;
  kind: 'location' | 'status' | 'estimate' | 'resolutionComment' | 'supervisionResult' | 'evidence' | 'availability';
  reportId?: number;
  terminal: boolean;
  lastError?: string;
};

export type TerminalOperationDetail = {
  id: string;
  description: string;
  error: string;
};

function descriptionFor(operation: OperationForRecovery): string {
  switch (operation.kind) {
    case 'location': return `Ubicación del reporte #${operation.reportId}`;
    case 'status': return `Cambio de estado del reporte #${operation.reportId}`;
    case 'estimate': return `Tiempo estimado del reporte #${operation.reportId}`;
    case 'resolutionComment': return `Comentario de resolución del reporte #${operation.reportId}`;
    case 'supervisionResult': return `Resultado de supervisión del reporte #${operation.reportId}`;
    case 'evidence': return `Evidencia del reporte #${operation.reportId}`;
    case 'availability': return 'Cambio de disponibilidad';
  }
}

export function getTerminalOperationDetails(operations: readonly OperationForRecovery[]): TerminalOperationDetail[] {
  return operations
    .filter((operation) => operation.terminal)
    .map((operation) => ({
      id: operation.id,
      description: descriptionFor(operation),
      error: operation.lastError ?? 'El servidor rechazó esta operación. Descártala antes de registrar un nuevo cambio.',
    }));
}

export function getRecoverableOperationCount(operations: readonly OperationForRecovery[]): number {
  return operations.filter((operation) => !operation.terminal).length;
}
