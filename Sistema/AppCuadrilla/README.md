# ARJE Cuadrilla

Aplicación móvil de campo (Expo Router) para consultar reportes asignados, registrar su avance, adjuntar evidencia de resolución, compartir ubicación durante el seguimiento y cambiar la disponibilidad de la cuadrilla.

Este README está dirigido a quienes mantienen y verifican la aplicación. La sección «Operación en campo» describe las acciones visibles para la cuadrilla; las secciones de configuración y pruebas son para desarrollo y QA.

## Configuración y verificación

- Requiere las dependencias del proyecto instaladas y una API accesible desde el dispositivo. La aplicación usa `EXPO_PUBLIC_API_BASE_URL`; si no se define, usa `http://10.0.2.2:5170/api`, dirección del emulador Android configurada en `src/services/api.ts`.
- Desde `Sistema/AppCuadrilla`, `npm test` ejecuta las pruebas de servicios y políticas de campo; `npx tsc --noEmit` comprueba tipos; `npx expo lint` ejecuta ESLint. Estos tres comandos se verificaron en el worktree el 14 de octubre de 2026.
- El inicio de sesión de cuadrilla utiliza la API. La lista y el detalle de reportes necesitan conexión para su primera carga; la aplicación no conserva una copia offline de esos datos.

## Operación en campo

1. Inicia sesión y abre un reporte asignado mientras haya conexión para consultar su detalle.
2. En el detalle, avanza el estado en este orden: Asignado → Levantando información → En proceso → Completado. La interfaz solo ofrece el siguiente estado permitido. Para completar, debe existir evidencia de resolución (`tipo=2`) confirmada por el servidor o guardada en la cola sin rechazo terminal.
3. Usa **Tomar foto** o **Galería** y después **Subir evidencia** para registrar evidencia de resolución. Inicia el seguimiento GPS desde el reporte cuando se requiera; la aplicación solicita permisos de ubicación en primer y segundo plano. Los puntos recibidos por la tarea en segundo plano se guardan en la cola.
4. En la lista, selecciona **Disponible**, **Ocupada** o **Fuera de servicio**. **Disponible** se habilita solo cuando la aplicación pudo confirmar con la API que no hay reportes activos ni cambios de estado pendientes.

Los cambios de estado, evidencias, puntos GPS y cambios de disponibilidad se guardan primero en una cola local de AsyncStorage y luego se intenta enviarlos. El indicador muestra si hay conexión, cuántas operaciones permanecen pendientes y cuántas fueron rechazadas. «Operación guardada en el dispositivo» significa que aún no se confirmó en el servidor.

## Si se pierde la conexión

La aplicación intenta sincronizar al recuperar la conectividad y también después de iniciar o restablecer la sesión. El botón **Reintentar sincronización** permite intentarlo manualmente. Las ubicaciones consecutivas de un mismo reporte se envían en un lote; el resto de operaciones conserva su orden en la cola. Un estado pendiente bloquea otro cambio de estado del mismo reporte hasta que se envíe y se vuelva a consultar el detalle al servidor.

Si la API responde 401 o 403, la sincronización se detiene y conserva la operación; usa **Iniciar sesión** para renovar la sesión. Si responde 400 o 409, la operación queda marcada como rechazada y no se reenvía automáticamente. El indicador muestra cuántas operaciones fueron rechazadas y una advertencia genérica para revisar el reporte; la interfaz no muestra el motivo detallado que devolvió el servidor ni ofrece una acción para editar o descartar esa operación. Ante un error transitorio, las operaciones permanecen en la cola para un intento posterior. Si no se puede leer la cola, la interfaz bloquea nuevas transiciones y muestra un error.

## Límites conocidos y validación pendiente

- La cola conserva la URI de cada foto, no una copia independiente del archivo. Una subida posterior depende de que la URI siga siendo accesible. No se ha validado esta persistencia tras reiniciar un dispositivo físico.
- La entrega de GPS es al menos una vez: si la API acepta un lote y la aplicación se interrumpe antes de quitarlo de la cola, un reintento podría enviarlo de nuevo. No hay deduplicación implementada para ese caso.
- La cola no identifica a la cuenta propietaria de cada operación. Se debe definir y validar una política antes de usar cuentas distintas en un dispositivo compartido.
- No se ha ejecutado la secuencia completa en un dispositivo físico ni en emulador. Quedan por comprobar permisos, cámara/galería, GPS en segundo plano, acceso a archivos tras reinicio y presentación de los estados de sincronización.
