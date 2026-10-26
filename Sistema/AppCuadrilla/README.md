# ARJE Cuadrilla

Aplicación móvil de campo (Expo Router) para consultar reportes asignados, registrar su avance, adjuntar evidencia de resolución, compartir ubicación durante el seguimiento y cambiar la disponibilidad de la cuadrilla.

Este README está dirigido a quienes mantienen y verifican la aplicación. La sección «Operación en campo» describe las acciones visibles para la cuadrilla; las secciones de configuración y pruebas son para desarrollo y QA.

## Configuración y verificación

- Requiere las dependencias del proyecto instaladas y una API accesible desde el dispositivo. La aplicación usa `EXPO_PUBLIC_API_BASE_URL`; si no se define, usa `http://10.0.2.2:5170/api`, dirección exclusiva del emulador Android configurada en `src/services/api.ts`.
- Copia `.env.example` a `.env` y define `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_MAPTILER_API_KEY`, `EXPO_PUBLIC_MAPTILER_WEB_API_KEY` y, opcionalmente, `EXPO_PUBLIC_MAPTILER_MAP_ID`.
- Desde `Sistema/AppCuadrilla`, `npm test` ejecuta las pruebas de servicios y políticas de campo; `npm run typecheck` comprueba tipos; `npm run lint` ejecuta ESLint. Estos tres comandos se verificaron en el worktree el 26 de octubre de 2026.
- El inicio de sesión de cuadrilla utiliza la API. La lista y el detalle de reportes necesitan conexión para su primera carga; la aplicación no conserva una copia offline de esos datos.

### Flujo de asignación y cuentas iniciales

El administrador registra y consulta las cuadrillas desde el Panel Admin, y asigna cada reporte a una cuadrilla registrada. La aplicación de campo autentica la cuenta de la cuadrilla y la API filtra sus reportes por la cuadrilla incluida en el JWT; una cuenta no puede consultar reportes de otra.

Al iniciar la API se crean únicamente si no existen estas cuentas iniciales de demostración. Cámbialas o crea cuentas reales desde el Panel Admin antes de operar en producción:

| Cuadrilla | Usuario app | Contraseña inicial |
| --- | --- | --- |
| Cuadrilla Norte | `cuadrilla_norte` | `Norte2026!` |
| Cuadrilla Centro | `cuadrilla_centro` | `Centro2026!` |
| Cuadrilla Sur | `cuadrilla_sur` | `Sur2026!` |

### Mapas y ubicación

#### Mapa nativo

- **Tecnología**: MapLibre con `@maplibre/maplibre-react-native`.
- **Datos**: estilo raster de MapTiler; por defecto `streets-v4`.
- **Key**: `EXPO_PUBLIC_MAPTILER_API_KEY`.
- **Atribución**: © MapTiler y © OpenStreetMap contributors, visible en el mapa.
- **Desarrollo**: MapLibre es un módulo nativo. Usa un development build (`npx expo run:android` o EAS); Expo Go no incluye este módulo.

#### Mapa web

- **Tecnología**: Leaflet con `react-leaflet`.
- **Datos**: tiles y atribución de MapTiler.
- **Key**: `EXPO_PUBLIC_MAPTILER_WEB_API_KEY`.
- **Comportamiento**: permite enfocar el reporte, reintentar la carga y centrar el mapa en la ubicación propia.

Las keys de cliente son públicas en el bundle. Restringe cada una por plataforma: dominio para web y `User-Agent` real del build para nativo. Captura el `User-Agent` antes de aplicar la restricción; no lo supongas. Consulta [docs/operacion/mapas-maptiler.md](../../docs/operacion/mapas-maptiler.md).

#### Permisos de ubicación

- **Primer plano**: requerido para mostrar la ubicación del usuario y el reporte en el mapa.
- **Segundo plano**: requerido para el seguimiento GPS continuo durante `EstatusReporte.LevantandoInformacion` y `EnProceso`.
- **Configuración nativa**: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription` (iOS) y `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` (Android) en `app.json`.

### Inicio desde navegador o Expo Go en la red local

No uses `10.0.2.2` ni una IP escrita permanentemente en el código desde un teléfono físico. Primero inicia la API para aceptar conexiones externas en el puerto 5170 (por ejemplo, enlazada a `0.0.0.0:5170`). Después conecta el teléfono y esta computadora a la misma red Wi-Fi; evita redes de invitados o perfiles que aíslen dispositivos.

Desde `Sistema/AppCuadrilla`, ejecuta:

```bash
./scripts/start-lan.sh
```

El script detecta la IP privada actual del equipo, define para esa sesión `EXPO_PUBLIC_API_BASE_URL=http://<IP-LOCAL>:5170/api` e inicia Expo con `--lan --clear`, sin túnel. Escanea el QR o abre la URL web que muestre Expo. Ten en cuenta que el mapa nativo MapLibre requiere un development build, no Expo Go. Si el equipo tiene más de una red activa o la detección no elige la interfaz Wi-Fi, fija la IP explícitamente:

```bash
EXPO_LOCAL_IP=192.168.1.50 ./scripts/start-lan.sh
```

### Teléfono Android por USB

Para un teléfono físico conectado por USB, `10.0.2.2` no apunta a la computadora: sólo funciona en el emulador. Con la depuración USB autorizada, inicia la API y después ejecuta:

```bash
./scripts/start-usb.sh
```

El script configura `adb reverse` para Metro y la API, por lo que la aplicación usa `http://127.0.0.1:5170/api` dentro del teléfono. Si la pantalla de reportes muestra un error de conexión, confirma primero que `dotnet run` sigue activo en el puerto 5170.

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
- **Evidencias en web**: en la versión web, las imágenes se almacenan en IndexedDB vía `webImageStorage.ts` para persistencia tras recargar; en nativo se usa `expo-file-system` con copia a `FileSystem.documentDirectory`.
- **Evidencias de audio**: el botón «Grabar audio» muestra «No disponible» (pendiente de implementación).
- **Validación GPS en segundo plano**: pendiente de validar en dispositivo físico el funcionamiento continuo, consumo de batería y precisión.
- **MapTiler y dispositivo físico**: pendiente validar la restricción de key por `User-Agent`, el mapa nativo en dispositivo y el comportamiento con red intermitente.

El estado detallado de pruebas automatizadas y pendientes está en [docs/operacion/validacion-maptiler.md](../../docs/operacion/validacion-maptiler.md).
