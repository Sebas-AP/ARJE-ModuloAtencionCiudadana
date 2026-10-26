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
| API real, base de datos aislada y recorrido completo | Verificado | `npm run test:integration`: 3 pruebas Playwright aprobadas contra API y SQLite aislados. |
| SignalR real contra backend | Verificado | Dos sesiones del panel recibieron eventos reales del hub; el snapshot y el hub rechazaron cuadrilla (403) y anónimo (401). |
| Latencia de actualización | Verificado | 165/178 ms para una cuadrilla y 31/47 ms para otra, desde el POST hasta el marcador en dos sesiones. |
| Muestra antigua e idempotencia | Verificado | Una captura de hace 10 minutos no retrocedió el marcador; un `idMuestra` duplicado no creó otra fila. |
| Corte de WebSocket y reconexión | Verificado en navegador | Corte forzado del socket con la pestaña abierta; recuperación automática y marcador actualizado en 2.5 s. |
| Carga de 235 reportes | Verificado | El mapa mostró los 235 reportes paginados en 1.0 s con la API local aislada. |
| MapTiler real, restricciones 403, cuota 429 y consumo | Pendiente | Las pruebas sustituyen los tiles por respuestas locales. |
| GPS físico, permisos y segundo plano | Pendiente | Requiere dispositivo Android/iOS y build de desarrollo. |
| Entrada online/offline del mismo pin ciudadano | Parcial | Cubierto por pruebas del modelo; la prueba integrada crea el reporte por REST, no desde la app ni su cola offline. |
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

### Prueba integrada con API real

Comando, desde `Sistema/PanelAdmin`:

```bash
npx playwright install chromium
npm run test:integration
```

La configuración levanta una API real con SQLite en `/tmp/arje-mapas-integracion.db` y el Panel compilado en modo producción, sin reutilizar procesos existentes. Sólo se interceptan los tiles de `https://api.maptiler.com/**`; REST, SignalR, autenticación y persistencia son reales.

Resultado: 3 pruebas aprobadas en 35.5 s.

- Autorización: snapshot y negotiate del hub respondieron 200 al administrador, 403 a una cuadrilla y 401 a un anónimo.
- Recorrido: dos reportes ciudadanos con coordenadas se asignaron a cuadrillas distintas y avanzaron a `LevantandoInformacion` y `EnProceso`.
- Dos sesiones del panel mostraron dos cuadrillas y recibieron ubicaciones por SignalR real.
- Latencia desde el POST hasta el marcador: 165/178 ms para la primera cuadrilla y 31/47 ms para la segunda.
- La marca conservó el timestamp UTC de captura y se mostró como reciente.
- Una captura de hace 10 minutos se persistió, pero no retrocedió el marcador; la consulta a SQLite confirmó tres filas y la más reciente como última.
- Reenviar la primera muestra con el mismo `idMuestra` respondió 200 y mantuvo tres filas.
- Se forzó el cierre del WebSocket y el navegador se puso offline; una sesión siguió actualizándose y la otra no. Al volver online, la sesión afectada se reconectó y actualizó en 2.5 s.
- Se crearon 235 reportes por REST y una sesión nueva mostró `235 visibles` en 1.0 s.

La prueba también detectó que las fechas de ubicación volvían de SQLite sin zona UTC y el Panel las interpretaba como hora local, por lo que una muestra recién capturada aparecía como desactualizada. Se normalizaron los DTO y la proyección del snapshot a `DateTimeKind.Utc`; la prueba ahora exige que `fechaHora` y `fechaRecepcion` terminen en `Z`.

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
- El recorrido integrado usa una API local con SQLite, no el despliegue SQL Server de producción.
- El corte de red se simuló en Chromium cerrando el WebSocket y poniendo el contexto offline; no se probó una red móvil real, pérdida de permiso ni pantalla bloqueada.
- No se probó el vencimiento del token durante una sesión activa ni un cierre de sesión remoto, aunque sí se rechazaron roles y solicitudes sin token.
- El volumen de 235 reportes se ejecutó en local; no se probó con la latencia ni el hardware de producción.
- No se validó el mapa en Android/iOS físico ni el consumo de batería en segundo plano.
- No se validó iOS: el entorno de trabajo es Linux.
- No se validó una key MapTiler real, sus restricciones por dominio/`User-Agent`, respuestas 403/429 ni el consumo mensual.

## Criterios pendientes antes de aceptación operativa

1. Repetir el recorrido con SQL Server y el despliegue real, no sólo con SQLite local.
2. Probar vencimiento de token, cierre de sesión y permiso revocado durante una sesión activa.
3. Validar red móvil real, segundo plano y recuperación tras suspensión del dispositivo.
4. Capturar el `User-Agent` de cada build nativo y aplicar la restricción de key correspondiente.
5. Probar 403, 429 y recuperación de tiles con MapTiler real.
6. Registrar builds Android e iOS en dispositivos físicos y el comportamiento en segundo plano.
7. Estimar consumo mensual de MapTiler con cargas reales y usuarios esperados.
8. Repetir la carga de 235 reportes con la base y el hardware de producción.
