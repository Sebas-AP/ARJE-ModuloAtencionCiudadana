export function resolveMockMode(configuredValue: string | undefined, savedValue: string | null): boolean {
  if (configuredValue !== undefined) {
    return configuredValue === 'true';
  }

  return savedValue === 'true';
}
