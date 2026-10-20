import * as FileSystem from 'expo-file-system/legacy';

const evidenceDirectory = `${FileSystem.documentDirectory ?? ''}arje-evidence/`;

export const EVIDENCE_UNAVAILABLE_MESSAGE = 'La evidencia seleccionada ya no está disponible. Vuelve a tomarla o selecciónala antes de reintentar.';

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'evidencia';
}

function newFileName(name: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName(name)}`;
}

export function isDurableEvidenceUri(uri: string): boolean {
  return Boolean(FileSystem.documentDirectory) && uri.startsWith(evidenceDirectory);
}

export async function persistEvidence(uri: string, name: string): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('No hay almacenamiento persistente disponible en este dispositivo. Libera espacio e inténtalo de nuevo.');
  }
  const source = await FileSystem.getInfoAsync(uri);
  if (!source.exists || source.isDirectory) throw new Error(EVIDENCE_UNAVAILABLE_MESSAGE);

  await FileSystem.makeDirectoryAsync(evidenceDirectory, { intermediates: true });
  const destination = `${evidenceDirectory}${newFileName(name)}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  const copied = await FileSystem.getInfoAsync(destination);
  if (!copied.exists || copied.isDirectory) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    throw new Error('No se pudo guardar una copia segura de la evidencia. Inténtalo de nuevo.');
  }
  return destination;
}

export async function assertPersistedEvidence(uri: string): Promise<void> {
  if (!isDurableEvidenceUri(uri)) throw new Error(EVIDENCE_UNAVAILABLE_MESSAGE);
  const file = await FileSystem.getInfoAsync(uri);
  if (!file.exists || file.isDirectory) throw new Error(EVIDENCE_UNAVAILABLE_MESSAGE);
}

export async function removePersistedEvidence(uri: string): Promise<void> {
  if (!isDurableEvidenceUri(uri)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
