# Runbook: mapas MapTiler y ubicaciones de cuadrillas

## Alcance

Este documento describe la operación de la cartografía MapTiler y del seguimiento de ubicaciones en:

- `Sistema/PanelAdmin`: mapa general de reportes y cuadrillas con Leaflet.
- `Sistema/AppCuadrilla`: mapa nativo con MapLibre y mapa web con Leaflet.
- `Sistema/AppCiudadano`: selector de ubicación del reporte y mapa de detalle.
- `Sistema/API`: persistencia de muestras GPS y distribución de la última posición por SignalR.

La evidencia de pruebas y las plataformas que aún no se validaron están en [validacion-maptiler.md](validacion-maptiler.md).

## Variables de entorno

Cada aplicación carga su propio archivo `.env`; el `.env` de la raíz del repositorio no se propaga automáticamente a Vite ni a Expo.

| Aplicación | Variable | Uso |
| --- | --- | --- |
| PanelAdmin | `VITE_API_BASE_URL` | Base de la API, por ejemplo `http://localhost:5170/api`. |
| PanelAdmin | `VITE_MAPTILER_API_KEY` | Key pública usada por el mapa web del panel. |
| PanelAdmin | `VITE_MAPTILER_MAP_ID` | Estilo o mapa de MapTiler; por defecto `streets-v4`. |
| AppCuadrilla | `EXPO_PUBLIC_API_BASE_URL` | Base de la API accesible desde el dispositivo. |
| AppCuadrilla | `EXPO_PUBLIC_MAPTILER_API_KEY` | Key para el mapa nativo MapLibre. |
| AppCuadrilla | `EXPO_PUBLIC_MAPTILER_WEB_API_KEY` | Key para la variante web Leaflet. |
| AppCuadrilla | `EXPO_PUBLIC_MAPTILER_MAP_ID` | Estilo o mapa de MapTiler; por defecto `streets-v4`. |
| AppCiudadano | `EXPO_PUBLIC_API_URL` | Base de la API accesible desde el dispositivo. |
| AppCiudadano | `EXPO_PUBLIC_MAPTILER_API_KEY` | Key para el mapa nativo MapLibre. |
| AppCiudadano | `EXPO_PUBLIC_MAPTILER_WEB_API_KEY` | Key para la variante web Leaflet. |
| AppCiudadano | `EXPO_PUBLIC_MAPTILER_MAP_ID` | Estilo o mapa de MapTiler; por defecto `streets-v4`. |

Las keys de cliente son visibles en el bundle o en el tráfico del navegador; no son secretos. Protégelas mediante restricciones del proveedor, no asumiendo que el valor permanecerá oculto.

## Keys y restricciones

1. Crea keys separadas por aplicación y plataforma. No reutilices una key web en builds nativos.
2. Restringe las keys web por dominio exacto, incluyendo los dominios de desarrollo y producción que correspondan.
3. Para las keys nativas, captura primero el `User-Agent` real del build con un proxy de depuración o con la evidencia del proveedor. Después aplica la restricción por `User-Agent`. No supongas el valor a partir del nombre de la aplicación.
4. Define cuotas y alertas en el panel de MapTiler antes de una operación con usuarios reales.
5. Para rotar una key, crea la nueva, actualiza el entorno de la aplicación, verifica una carga real de mapa y después revoca la anterior.

Si una key no carga el mapa, la aplicación muestra un aviso visible. Una respuesta 403 normalmente indica restricción de dominio, `User-Agent` o key revocada; una respuesta 429 indica cuota o límite de frecuencia.

## Contratos usados por las aplicaciones

### REST

- `GET /api/cuadrillas/ubicaciones/ultimas`: snapshot de la última posición por cuadrilla. Requiere sesión administrativa.
- `GET /api/reportes?pagina=N&registrosPorPagina=M`: el mapa del panel recorre todas las páginas y exige el total en `x-total-count` o `cantidadTotalRegistros`.
- `POST /api/reportes/{id}/ubicaciones`: lote de muestras GPS de una cuadrilla autorizada para el reporte en estados 3 o 4.

Cada muestra conserva `fechaHora` e identidad. La API valida pertenencia, estado y rangos; acepta latitud o longitud cero y rechaza valores no finitos o fuera de rango.

### SignalR

- Hub: `/hubs/ubicaciones`.
- Evento: `ubicacionCuadrillaActualizada`.
- Autorización: el hub exige el rol `Administrador`. La cuadrilla envía sus muestras por REST y el ciudadano no consume este hub ni el snapshot administrativo.
- El panel reconcilia por REST cada 30 segundos mientras la pantalla de mapa está visible. Si el WebSocket se pierde, conserva la última información y muestra el estado degradado.

## Preparación local

### PanelAdmin

```bash
cd Sistema/PanelAdmin
npm install
cp .env.example .env
# Editar VITE_API_BASE_URL y VITE_MAPTILER_API_KEY
npm run dev
```

Verificación:

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

`test:e2e` usa Playwright, intercepta API, SignalR y tiles, e inicia el servidor Vite con la key ficticia `e2e-maptiler-key`. No consume la key real ni requiere la API local.

### AppCuadrilla

```bash
cd Sistema/AppCuadrilla
npm install
cp .env.example .env
# Editar EXPO_PUBLIC_API_BASE_URL y las keys MapTiler
npx expo run:android   # development build con MapLibre nativo
npx expo start --web   # variante web con Leaflet
```

Verificación:

```bash
npm test
npm run typecheck
npm run lint
npx expo export --platform web --output-dir /tmp/arje-cuadrilla-web
```

### AppCiudadano

```bash
cd Sistema/AppCiudadano
npm install
cp .env.example .env
# Editar EXPO_PUBLIC_API_URL y las keys MapTiler
npx expo run:android   # development build con MapLibre nativo
npx expo start --web   # selector y detalle con Leaflet
```

Verificación:

```bash
npm test
npm run typecheck
npm run lint
npx expo export --platform web --output-dir /tmp/arje-ciudadano-web
```

La app ciudadana no envía ni encola un reporte sin una ubicación confirmada. El pin elegido se conserva al actualizar el GPS; un GPS posterior no lo reemplaza. Las coordenadas del detalle provienen del reporte autorizado y no del snapshot de cuadrillas.

## Builds y despliegue

1. Configura las variables en el entorno de compilación, no sólo en el equipo de desarrollo.
2. Compila el panel con `npm run build` y publica `dist/`.
3. Genera development builds o builds de producción de las apps móviles con el perfil de EAS o con `expo run:*`. MapLibre es un módulo nativo: Expo Go no es suficiente.
4. Publica la API con HTTPS, configura CORS para el dominio del panel y permite WebSockets en el proxy para `/hubs/ubicaciones`.
5. Verifica después del despliegue: carga de tiles, snapshot REST, evento SignalR, permisos de ubicación y rechazo de acceso administrativo para ciudadanos y cuadrillas.

## Diagnóstico operativo

| Síntoma | Revisión |
| --- | --- |
| «Mapa no disponible: falta la clave MapTiler» | La variable de la plataforma no llegó al bundle. Revisa el `.env` y reinicia el servidor de desarrollo o la compilación. |
| Aviso de tiles y el botón «Reintentar» no recupera | Revisa la key, restricciones, cuota y conectividad con `api.maptiler.com`. |
| Panel sin cuadrillas o con «conexión degradada» | Revisa `/api/cuadrillas/ubicaciones/ultimas`, el token, WebSockets y el hub. El panel reintenta y reconcilia por REST. |
| Cuadrilla sin marcador | Comprueba que el reporte esté en estado 3/4, que el permiso de ubicación siga concedido y que la cola haya enviado muestras. |
| Marcador atenuado | La última muestra tiene más de 120 segundos y se muestra como «Ubicación desactualizada». |
| Un reporte ciudadano no se envía | Debe existir un pin válido y confirmado; sin confirmación no se llama a la API ni se encola. |

## Límites conocidos

- MapTiler se usa en línea; no hay mapa offline ni caché persistente de tiles.
- La línea del panel entre reporte y cuadrilla es una referencia recta, no una ruta calculada.
- El snapshot y el hub son mecanismos administrativos; no deben exponerse al ciudadano.
- El consumo de MapTiler depende de cargas de mapa y estilos, no de la cantidad de mensajes GPS. Consulta el tablero del proveedor para estimar el consumo real.
- La validación física de GPS, permisos, consumo de batería y restauración tras reinicio permanece pendiente según [validacion-maptiler.md](validacion-maptiler.md).
