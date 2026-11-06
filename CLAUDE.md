CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ARJE Módulo Atención Ciudadana: a water-utility citizen-complaint system with four apps under `Sistema/`:

- `API/` — ASP.NET Core 8 backend (REST + SignalR), SQLite in dev / SQL Server in prod.
- `API.Tests/` — xUnit test suite for the API.
- `AppCiudadano/` — Expo/React Native app for citizens to file and track reports.
- `AppCuadrilla/` — Expo Router app for field crews to receive and resolve assignments.
- `PanelAdmin/` — React + Vite admin web panel (live map, metrics, user/crew management).

`AppCiudadano/` and `AppCuadrilla/` each have their own `CLAUDE.md`/`AGENTS.md` with Expo-specific rules (versioned docs lookup, `expo install`, Expo Router conventions) — those apply automatically when working inside those folders.

## Commands

### API (`Sistema/API`, tests in `Sistema/API.Tests`)

```bash
dotnet build Sistema/API/ARJE.Api.csproj
dotnet test Sistema/API.Tests/ARJE.Api.Tests.csproj            # full suite
dotnet test Sistema/API.Tests/ARJE.Api.Tests.csproj --filter "FullyQualifiedName~FieldOperationPolicyTests"  # single class
dotnet run --project Sistema/API/ARJE.Api.csproj               # run API locally (SQLite by default)
```

SQL Server–specific concurrency tests only run when `ARJE_SQLSERVER_TEST_CONNECTION` is set; otherwise they're skipped.

### PanelAdmin (`Sistema/PanelAdmin`)

```bash
npm run dev             # Vite dev server
npm run build            # tsc -b && vite build
npm run lint             # oxlint
npm test                 # node --test tests/*.test.ts
npm run test:e2e         # Playwright
npm run test:integration # Playwright against a running API (playwright.integration.config.ts)
```

### AppCiudadano / AppCuadrilla (`Sistema/AppCiudadano`, `Sistema/AppCuadrilla`)

```bash
npx expo start            # dev server (use run-lan.sh from repo root for LAN/device testing)
npx expo lint
npx tsc --noEmit
node --test tests/*.test.ts
```

### Full-stack local run

`./run-lan.sh` and `./run-tunnel.sh` at the repo root start the apps against a LAN IP or a tunnel so physical devices can reach the API — each app needs `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_API_BASE_URL` (or `VITE_API_BASE_URL` for PanelAdmin) pointed at the reachable API address, not `localhost`. See `.env.example` for every variable each component reads.

## Architecture

### Domain and status flow

Core entities (`API/Entidades/`): `Reporte`, `Evidencia`, `Cuadrilla`, `SeguimientoUbicacion`, `UsuarioSistema`, defined in `ApplicationDbContext`. A report moves through `EstatusReporte`: `Nuevo → Asignado → LevantandoInformacion → EnProceso → Completado → EnSupervision → Cerrado`. Allowed field-crew transitions, assignment checks, and completion requirements (must have a `Resolucion`-type evidence) are centralized in `Servicios/FieldOperationPolicy.cs` — don't reimplement these checks in controllers.

### API controller pattern

Most CRUD controllers derive from the generic `CustomBaseController<TEntidad, TCreacionDTO, TLecturaDTO>` (`Controllers/CustomBaseController.cs`), which handles paging (`x-total-count` header via `IQueryableExtensions.Paginar`), AutoMapper DTO projection, and output-cache tag eviction on writes. `ReportesController` overrides/extends this heavily since reports have public (anonymous) and authenticated views side by side — e.g. `GET /api/reportes/{id}/publico` (citizen, filtered DTO without phone/GPS/crew info) vs `GET /api/reportes/{id}` (authenticated, full detail). When adding report endpoints, check whether a public-facing counterpart is needed and keep sensitive fields out of the public DTOs (`ReportePublicoDTO`, `EvidenciaPublicoDTO`).

### Auth

JWT bearer auth (`Utilidades/ArjeAuthenticationConfiguration.cs`) with two roles (`Administrador`, `Cuadrilla`). The SignalR hub (`/hubs/ubicaciones`, admin-only) reads the token from the `access_token` query string since browsers can't set auth headers on WebSocket upgrades. Citizens get a short-lived, scope-limited JWT (60 min, tied to one `reporteId`) to upload evidence anonymously after creating a report — see `PostEvidenciaCiudadano` in `ReportesController`.

### CORS

`Utilidades/ArjeCorsConfiguration.cs` allows explicit origins from config plus, only when `ASPNETCORE_ENVIRONMENT=Development`, any `localhost` or private-LAN origin (10.x, 172.16–31.x, 192.168.x, link-local) — this is what lets Expo apps on a phone reach the API over LAN during development without listing every dev machine's IP.

### Real-time crew locations

`SeguimientoUbicacion` rows are written by `IUbicacionesCuadrillaService`; `IUbicacionesPublisher`/`UbicacionesPublisher` then broadcasts the latest position over the `UbicacionesHub` SignalR hub. PanelAdmin consumes this via `src/hooks/ubicacionesStore` + `useUbicacionesCuadrillas`. GPS tracking on the crew app starts on `LevantandoInformacion`/`EnProceso` and stops on `Completado` — mirror that lifecycle if you touch tracking logic.

### AI classification with heuristic fallback

`ClasificadorNvidiaService` (`Servicios/`) calls NVIDIA's API to classify a report's free-text description into a `TipoProblema` and `PrioridadReporte` with a confidence/justification. If `NVIDIA_API_KEY` is unset, the call fails, or the model returns an unrecognized category, it falls back to a deterministic keyword-based heuristic (`ClasificacionFallback`) so classification always succeeds — preserve this fallback behavior when editing the service.

### File storage

`IAlmacenadorArchivos` abstracts evidence file storage; `AlmacenadorArchivosImgbb` (image hosting) is the registered implementation in `Program.cs`, with `AlmacenadorArchivosLocal` as a local-disk alternative. Validation (MIME via magic bytes, size limit from `MaxFileSizeMB`/`.env`) lives in the implementation, not the controller.

### Maps

All three frontends use MapTiler (Leaflet on web/PanelAdmin, MapLibre on native mobile), each requiring its own API key env var (see `.env.example` and `docs/operacion/mapas-maptiler.md`). `docs/operacion/validacion-maptiler.md` tracks what's been validated vs. still needs a physical device.

## Reference docs

- `docs/MANUAL_TECNICO.md`, `docs/ESTADO_IMPLEMENTACION.md` — technical manual and implementation status.
- `docs/MANUAL_USUARIO_PANEL_ADMIN.md` / `docs/GUIA_BASE_MANUAL_USUARIO_PANEL_ADMIN.md` — PanelAdmin user guide.
- `docs/operacion/` — MapTiler setup and validation notes.
