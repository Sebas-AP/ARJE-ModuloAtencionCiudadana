import { defineConfig, devices } from '@playwright/test';
import {
  API_ORIGIN,
  API_URL,
  INTEGRATION_DB_PATH,
  PANEL_ORIGIN,
} from './tests/integration/constants.ts';

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: PANEL_ORIGIN,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        ignoreHTTPSErrors: true,
      },
    },
  ],
  webServer: [
    {
      command: `rm -f ${INTEGRATION_DB_PATH} ${INTEGRATION_DB_PATH}-shm ${INTEGRATION_DB_PATH}-wal && dotnet run --project ../API/ARJE.Api.csproj --no-launch-profile`,
      url: `${API_URL}/reportes/landing`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: API_ORIGIN,
        ConnectionStrings__DefaultConnection: `Data Source=${INTEGRATION_DB_PATH}`,
        NvidiaApiKey: '',
        origenesPermitidos: `${PANEL_ORIGIN},http://localhost:4180`,
      },
    },
    {
      command: `npm run build && npm run preview -- --host 127.0.0.1 --port 4180 --strictPort`,
      url: PANEL_ORIGIN,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: API_URL,
        VITE_USE_MOCK: 'false',
        VITE_MAPTILER_API_KEY: 'integration-maptiler-key',
        VITE_MAPTILER_MAP_ID: 'streets-v4',
      },
    },
  ],
});
