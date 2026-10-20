export async function loadRemoteReportes<T>(request: () => Promise<T>): Promise<T> {
  return request();
}
