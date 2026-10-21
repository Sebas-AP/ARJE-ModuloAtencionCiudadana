# ARJE Cuadrilla

Aplicación móvil de campo (Expo Router) para consultar reportes asignados, registrar su avance, adjuntar evidencia de resolución, compartir ubicación durante el seguimiento y cambiar la disponibilidad de la cuadrilla.

Este README está dirigido a quienes mantienen y verifican la aplicación. La sección «Operación en campo» describe las acciones visibles para la cuadrilla; las secciones de configuración y pruebas son para desarrollo y QA.

## Configuración y verificación

- Requiere las dependencias del proyecto instaladas y una API accesible desde el dispositivo. La aplicación usa `EXPO_PUBLIC_API_BASE_URL`; si no se define, usa `http://10.0.2.2:5170/api`, dirección exclusiva del emulador Android configurada en `src/services/api.ts`.
- Desde `Sistema/AppCuadrilla`, `npm test` ejecuta las pruebas de servicios y políticas de campo; `npx tsc --noEmit` comprueba tipos; `npx expo lint` ejecuta ESLint. Estos tres comandos se verificaron en el worktree el 14 de octubre de 2026.
- El inicio de sesión de cuadrilla utiliza la API. La lista y el detalle de reportes necesitan conexión para su primera carga; la aplicación no conserva una copia offline de esos datos.

### Configuración del Mapa (Nativo y Web)

#### Proveedor de mapas nativo
- **Proveedor**: Google Maps a través de `react-native-maps` con `PROVIDER_GOOGLE`.
- **Requisitos**: Requiere API Key de Google Maps configurada en `app.json` / `app.config.js` bajo `ios.config.googleMapsApiKey` y `android.config.googleMaps.apiKey`.
- **Atribución**: Google Maps usa datos de © Google, © OpenStreetMap contributors. La atribución se muestra automáticamente en el mapa.

#### Mapa web
- **Implementación actual**: Pantalla informativa con coordenadas (ver `MapaScreen.web.tsx`).
- **Pendiente**: Mapa interactivo con Leaflet/MapLibre GL JS para paridad con nativo.
- **Atribución**: OpenStreetMap © OpenStreetMap contributors.

#### Permisos de ubicación
- **Foreground**: Requerido para mostrar la ubicación del usuario y el reporte en el mapa.
- **Background**: Requerido para el seguimiento GPS continuo durante el levantamiento de información y el proceso (`EstatusReporte.LevantandoInformacion` y `EnProceso`).
- **Configuración nativa**: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription` (iOS) y `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` (Android) en `app.json` / `expo.plist` / `AndroidManifest.xml`.

#### Atribución cartográfica
- **Google Maps (nativo)**: © Google, © OpenStreetMap contributors. Se muestra automáticamente.
- **OpenStreetMap (web/futuro)**: © OpenStreetMap contributors.
- **Estilo de mapa personalizado**: Estilo JSON definido en `MapaScreen.native.tsx` (`mapStyle` array), basado en estilo "Light" de Google Maps.

### Inicio desde navegador o Expo Go en la red local

No uses `10.0.2.2` ni una IP escrita permanentemente en el código desde un teléfono físico. Primero inicia la API para aceptar conexiones externas en el puerto 5170 (por ejemplo, enlazada a `0.0.0.0:5170`). Después conecta el teléfono y esta computadora a la misma red Wi-Fi; evita redes de invitados o perfiles que aíslen dispositivos.

Desde `Sistema/AppCuadrilla`, ejecuta:

```bash
./scripts/start-lan.sh
```

El script detecta la IP privada actual del equipo, define para esa sesión `EXPO_PUBLIC_API_BASE_URL=http://<IP-LOCAL>:5170/api` e inicia Expo con `--lan --clear`, sin túnel. Escanea el QR con Expo Go o abre la URL web que muestre Expo. Si el equipo tiene más de una red activa o la detección no elige la interfaz Wi-Fi, fija la IP explícitamente:

```bash
EXPO_LOCAL_IP=192.168.1.50 ./scripts/start-lan.sh
```

La API debe permitir tráfico entrante desde la red local en el puerto 5170. Si el inicio de sesión falla en el teléfono pero funciona en navegador, comprueba que el firewall del equipo no bloquee ese puerto y abre desde el navegador del teléfono `http://<IP-LOCAL>:5170` para confirmar que puede alcanzar el servidor.

## Operación en campo

1. Inicia sesión y abre un reporte asignado mientras haya conexión para consultar su detalle.
2. En el detalle, avanza el estado en este orden: Asignado → Levantando información → En proceso → Completado. La interfaz solo ofrece el siguiente estado permitido. Para completar, debe existir evidencia de resolución (`tipo=2`) confirmada por el servidor o guardada en la cola sin rechazo terminal.
3. Usa **Tomar foto** o **Galería** y después **Subir evidencia** para registrar evidencia de resolución. Inicia el seguimiento GPS desde el reporte cuando se requiera; la aplicación solicita permisos de ubicación en primer y segundo plano. Los puntos recibidos por la tarea en segundo plano se guardan en la cola.
4. En la lista, selecciona **Disponible**, **Ocupada** o **Fuera de servicio**. **Disponible** se habilita solo cuando la aplicación pudo confirmar con la API que no hay reportes activos ni cambios de estado pendientes.

Los cambios de estado, evidencias, puntos GPS y cambios de disponibilidad se guardan primero en una cola local de AsyncStorage y luego se intenta enviarlos. El indicador muestra si hay conexión, cuántas operaciones permanecen pendientes y cuántas fueron rechazadas. «Operación guardada en el dispositivo» significa que aún no se confirmó en el servidor.

## Si se pierde la conexión

La aplicación intenta sincronizar al recuperar la conectividad y también después de iniciar o restablecer la sesión. El botón **Reintentar sincronización** permite intentarlo manualmente. Las ubicaciones consecutivas de un mismo reporte se envían en un lote; el resto de operaciones conserva su orden en la cola. Un estado pendiente bloquea otro cambio de estado del mismo reporte hasta que se envíe y se vuelva a consultar el detalle al servidor.

Si la API responde 401 o 403, la sincronización se detiene y conserva la operación; usa **Iniciar sesión** para renovar la sesión. Si responde 400 o 409, la operación queda marcada como rechazada y no se reenvía automáticamente. El indicador muestra cuántas operaciones fueron rechazadas y una advertencia genérica para revisar el reporte; la interfaz no muestra el motivo detallado que devolvió el servidor ni ofrece una acción para editar o descartar esa operación. Ante un error transitorio, las operaciones permanecen en la cola para un intento posterior. Si no se puede leer la cola, la interfaz bloquea nuevas transiciones y muestra un error.

## Historial GPS vs Ruta (Panel Admin)

En el Panel de Administración (`MapView.tsx`), la opción «Mostrar ruta» dibuja una **línea recta** entre el reporte y la última posición conocida de la cuadrilla. **No es una ruta calculada** (no usa servicio de routing como OSRM, GraphHopper o Google Directions). El historial real de puntos GPS se almacena en `SeguimientosUbicacion` y puede consultarse por reporte vía API (`/api/reportes/{id}/ubicaciones`).

## Límites conocidos y validación pendiente

- La cola conserva la URI de cada foto, no una copia independiente del archivo. Una subida posterior depende de que la URI siga siendo accesible. No se ha validado esta persistencia tras reiniciar un dispositivo físico.
- La entrega de GPS es al menos una vez: si la API acepta un lote y la aplicación se interrumpe antes de quitarlo de la cola, un reintento podría enviarlo de nuevo. No hay deduplicación implementada para ese caso.
- La cola no identifica a la cuenta propietaria de cada operación. Se debe definir y validar una política antes de usar cuentas distintas en un dispositivo compartido.
- No se ha ejecutado la secuencia completa en un dispositivo físico ni en emulador. Quedan por comprobar permisos, cámara/galería, GPS en segundo plano, acceso a archivos tras reinicio y presentación de los estados de sincronización.
- **Mapa web**: La versión web (`MapaScreen.web.tsx`) muestra solo coordenadas y un aviso; falta implementar mapa interactivo con Leaflet/MapLibre GL JS.
- **Evidencias en web**: En la versión web, las imágenes se almacenan en IndexedDB vía `webImageStorage.ts` para persistencia tras recargar; en nativo se usa `expo-file-system` con copia a `FileSystem.documentDirectory`.
- **Evidencias de audio**: El botón «Grabar audio» muestra «No disponible» (pendiente de implementación).
- **Validación GPS en segundo plano**: Pendiente de validar en dispositivo físico el funcionamiento continuo, consumo de batería y precisión.