# Validación de mapas MapTiler y ubicaciones

Fecha de registro: 26 de octubre de 2026.

Este documento separa la evidencia automatizada de las validaciones con API real, MapTiler real y dispositivos físicos. Una prueba con respuestas interceptadas no demuestra el funcionamiento de esos servicios externos.

## Resumen

| Área | Estado | Evidencia |
| --- | --- | --- |
| API: pruebas automatizadas | Verificado | `dotnet test --no-restore`: 113 pruebas aprobadas. |
| PanelAdmin: modelos y servicios | Verificado | `npm test`: 31 pruebas aprobadas. |
| PanelAdmin: compilación y lint | Verificado | `npm run build` correcto; `npm run lint` sin errores. |
| PanelAdmin: flujo de mapa en navegador | Verificado con mocks | `npm run test:e2e`: 2 pruebas Playwright aprobadas con API, SignalR y tiles interceptados. |
| AppCuadrilla: modelos y pantalla | Verificado de forma automatizada | `npm test`: 114 pruebas aprobadas; typecheck correcto. |
| AppCuadrilla: lint | Verificado con advertencias | Lint sin errores y 5 advertencias existentes. |
| AppCuadrilla: export web | Verificado | `npx expo export --platform web` correcto. |
| AppCiudadano: modelo de ubicación confirmada | Verificado | `npm test`: 10 pruebas aprobadas, incluidas las de este cambio. |
| AppCiudadano: typecheck y export web | Verificado | `tsc --noEmit` y export web correctos. |
| AppCiudadano: build Android debug | Verificado | `./gradlew :app:assembleDebug` generó `app-debug.apk`. |
| AppCiudadano: lint | Con fallos previos | 17 errores existentes en `Modal.tsx` y comillas sin escapar; no se introdujeron errores nuevos en los archivos de mapas. |
| API real, base de datos aislada y recorrido completo | Pendiente | No ejecutado en esta validación. |
| SignalR real contra backend | Pendiente | El E2E del panel simula el WebSocket y el negotiate. |
| MapTiler real, restricciones 403, cuota 429 y consumo | Pendiente | Las pruebas sustituyen los tiles por respuestas locales. |
| GPS físico, permisos y segundo plano | Pendiente | Requiere dispositivo Android/iOS y build de desarrollo. |
| Entrada online/offline del mismo pin ciudadano | Parcial | Cubierto por pruebas del modelo; no se ejecutó en dispositivo ni contra la cola real. |
| Detalle ciudadano con mapa | Implementado | Sin prueba E2E ni validación visual en dispositivo. |
| Build iOS | Pendiente | No es posible compilar iOS en el entorno Linux usado. |
| `User-Agent` nativo de MapTiler | Pendiente | No se capturó ni se aplicó una restricción real por `User-Agent`. |

## Pruebas automatizadas ejecutadas

### API

Comando, desde `Sistema/API.Tests`:

```bash
dotnet test --no-restore
```

Resultado: 113 pruebas aprobadas, 0 fallos y 0 omitidas. Cubren contratos de autorización, captura y concurrencia de ubicaciones, snapshot, SignalR, CORS y paginación. No sustituyen la prueba integrada con una base de datos aislada, la API en ejecución y clientes reales.

### PanelAdmin

Comandos, desde `Sistema/PanelAdmin`:

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Resultados:

- 31 pruebas unitarias aprobadas.
- Build de producción correcto.
- Lint sin errores; se conservan advertencias existentes del proyecto.
- 2 pruebas Playwright aprobadas:
  - Selección del reporte correcto y apertura del detalle.
  - Filtro por categoría y estatus.
  - Centrado del mapa en las coordenadas del reporte.
  - Snapshot con posición reciente, posición desactualizada y cuadrilla sin GPS.
  - Cambio a «desactualizada» por el paso del tiempo sin un evento nuevo.
  - Evento SignalR simulado que crea la posición de una cuadrilla y abre su popup.
  - Error de tiles visible y recuperación con «Reintentar».

La prueba intercepta `**/api/**`, el negotiate de `/hubs/ubicaciones`, el WebSocket y `https://api.maptiler.com/**`. Por tanto, valida la interfaz y la lógica de integración, no los servicios reales.

### AppCuadrilla

Comandos, desde `Sistema/AppCuadrilla`:

```bash
npm test
npm run typecheck
npm run lint
npx expo export --platform web --output-dir /tmp/arje-maptiler-cuadrilla-web
```

Resultados registrados:

- 114 pruebas aprobadas.
- Typecheck correcto.
- Lint con 0 errores y 5 advertencias.
- Export web correcto; la variante web usa Leaflet y no importa MapLibre nativo.

### AppCiudadano

Comandos, desde `Sistema/AppCiudadano`:

```bash
npm test
npm run typecheck
npm run lint
npx expo export --platform web --output-dir /tmp/arje-ciudadano-map-web
cd android && ./gradlew :app:assembleDebug --no-daemon
```

Resultados:

- 10 pruebas aprobadas, incluidas:
  - Rechazo de envío sin pin confirmado.
  - Conservación de una coordenada manual confirmada.
  - Prevención de que un GPS tardío sustituya una selección.
  - Invalidación de la confirmación al cambiar el pin.
  - Aceptación de `0,0` y rechazo de `NaN` y rangos inválidos.
- Typecheck correcto.
- Export web correcto. La búsqueda en el bundle no encontró referencias a `maplibre-react-native`.
- Build Android debug correcto; el autolinking ya no incluye `react-native-maps`.
- `react-native-maps` se eliminó de `package.json` y del lockfile porque no quedaban usos.
- Lint: 17 errores previos en `src/components/Modal.tsx` (`refs` durante render) y en comillas sin escapar de `CrearReporteScreen.tsx`. No hay errores en los componentes o el modelo nuevos. El comando termina con código distinto de cero.

## Qué no demuestra esta validación

- No se creó un reporte real desde AppCiudadano ni se comprobó que la misma coordenada confirmada llegue a la API y a la cola offline.
- No se ejecutó el recorrido API → base de datos → SignalR → Panel con dos sesiones; las pruebas de API usan el host de pruebas, no un despliegue real con clientes.
- No se midió el objetivo de actualización en 5 segundos con red estable.
- No se probó un corte de red móvil, una muestra antigua, reconexión real, token vencido, cierre de sesión ni permiso revocado.
- No se probaron 235 reportes ni el rendimiento con volúmenes reales.
- No se validó el mapa en Android/iOS físico, pantalla bloqueada, primer plano ni consumo de batería.
- No se validó iOS: el entorno de trabajo es Linux.
- No se validó el `User-Agent` nativo ni una key MapTiler restringida. La key de las pruebas E2E es ficticia y los tiles son respuestas locales.
- No se midió tráfico ni cuota mensual real de MapTiler.

## Criterios pendientes antes de aceptación operativa

1. Ejecutar la prueba integrada con una base de datos aislada y un reporte real.
2. Confirmar autorización: ciudadano y cuadrilla no acceden al snapshot ni al hub administrativo.
3. Medir la latencia desde la persistencia GPS hasta el movimiento del marcador.
4. Validar resiliencia: red intermitente, WebSocket caído, token vencido y permiso revocado.
5. Capturar el `User-Agent` de cada build nativo y aplicar la restricción de key correspondiente.
6. Probar 403, 429 y recuperación de tiles con MapTiler real.
7. Registrar builds Android e iOS en dispositivos físicos y el comportamiento en segundo plano.
8. Estimar consumo mensual de MapTiler con cargas reales y usuarios esperados.
