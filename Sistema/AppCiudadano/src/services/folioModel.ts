const FOLIO_PATTERN = /^FOL-(\d+)-(.+)$/i;

export function parseFolio(input: string): { id: number; numeroContrato: string } | null {
  const match = input.trim().match(FOLIO_PATTERN);
  if (!match) return null;

  const id = Number(match[1]);
  const numeroContrato = match[2].trim();
  if (!Number.isInteger(id) || id <= 0 || !numeroContrato) return null;

  return { id, numeroContrato };
}
