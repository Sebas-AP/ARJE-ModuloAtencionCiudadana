type ApiPlatform = 'web' | 'android' | 'ios' | 'windows' | 'macos';

const WEB_DEFAULT_API_URL = 'http://localhost:5170/api';
const ANDROID_EMULATOR_DEFAULT_API_URL = 'http://10.0.2.2:5170/api';

export function resolveApiBaseUrl(
  platform: ApiPlatform,
  configuredUrl?: string,
): string {
  if (configuredUrl?.trim()) {
    return configuredUrl.trim().replace(/\/+$/, '');
  }

  return platform === 'web'
    ? WEB_DEFAULT_API_URL
    : ANDROID_EMULATOR_DEFAULT_API_URL;
}
