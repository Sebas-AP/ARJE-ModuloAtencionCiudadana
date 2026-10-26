# PanelAdmin

Panel web de administración de ARJE. Usa React, TypeScript, Vite, Leaflet y SignalR.

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev
```

Variables principales:

- `VITE_API_BASE_URL`: base de la API, por ejemplo `http://localhost:5170/api`.
- `VITE_MAPTILER_API_KEY`: key pública de MapTiler restringida por dominio.
- `VITE_MAPTILER_MAP_ID`: estilo de MapTiler; por defecto `streets-v4`.
- `VITE_USE_MOCK`: sólo para desarrollo sin API.

## Verificación

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

`test:e2e` requiere Chromium de Playwright y no necesita una API ni una key real: intercepta reportes, cuadrillas, SignalR y tiles de MapTiler. Consulta [docs/operacion/validacion-maptiler.md](../../docs/operacion/validacion-maptiler.md) para saber qué cubre y qué sigue pendiente.

## Operación de mapas

El mapa general muestra reportes paginados y la última ubicación de cada cuadrilla. Las posiciones se actualizan por SignalR y se reconcilian por REST cada 30 segundos. Una posición con más de 120 segundos se muestra como desactualizada.

La configuración de MapTiler, restricciones de keys, contratos de API y diagnóstico están en [docs/operacion/mapas-maptiler.md](../../docs/operacion/mapas-maptiler.md).
