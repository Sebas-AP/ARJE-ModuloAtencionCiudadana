# AppCuadrilla: operación de campo confiable

**Fecha:** 2026-10-12  
**Estado:** Diseño aprobado; pendiente de revisión de la especificación y del plan de implementación.

## Propósito

Completar la fase operativa de `Sistema/AppCuadrilla` para que una cuadrilla pueda atender reportes con conectividad intermitente sin perder acciones de campo. La aplicación debe sincronizar ubicación, evidencias, cambios de estado y disponibilidad con la API existente, conservando la API como autoridad final.

## Alcance

- Cola local persistente para ubicación, cambios de estado, evidencias y disponibilidad.
- Sincronización al iniciar la aplicación, recuperar conectividad y después de ejecutar una acción de campo.
- Agrupación de puntos GPS por reporte para enviarlos en lote.
- Flujo guiado de estados: `Asignado` → `Levantando información` → `En proceso` → `Completado`.
- Evidencia de resolución obligatoria, enviada o pendiente en cola, antes de completar.
- Gestión de disponibilidad: `Disponible`, `Ocupada` y `Fuera de servicio`.
- Validación en la API de pertenencia del reporte a la cuadrilla autenticada y de transiciones válidas.
- Indicadores de conectividad y operaciones pendientes, con reintento manual.
- Pruebas de contratos, cola, reglas operativas y autorización.

## Fuera de alcance

- Publicación en tiendas.
- Notificaciones push.
- Almacenamiento de evidencias en nube; el backend mantiene el almacenador configurado actualmente.
- Auditoría administrativa integral y rediseño del PanelAdmin.

## Arquitectura

### Cola y sincronización móvil

Se añadirá un módulo `offlineQueue` que persiste operaciones en el dispositivo. Cada operación tendrá un identificador local, tipo, fecha de creación, contador de intentos y carga útil. Los tipos serán `location`, `status`, `evidence` y `availability`.

`syncService` leerá la cola en orden, agrupará elementos consecutivos de ubicación del mismo reporte en un lote y los enviará con el contrato de ubicaciones actual. Los demás tipos conservarán su orden relativo. Solo se eliminará una operación cuando el servidor acepte la solicitud.

La cola se procesa en los siguientes momentos:

1. Al restaurar una sesión autenticada.
2. Cuando el monitor de red detecte conectividad.
3. Después de agregar una operación mientras hay red.
4. Cuando el operador pulse reintentar.

Un error transitorio conserva el elemento para otro intento. Un error de validación se marca como fallido, se muestra al usuario y no se reintenta automáticamente. Un `401` preserva la cola y obliga a renovar la sesión.

### Servicios y UI

Los servicios HTTP seguirán siendo el único código que construye solicitudes. La UI utilizará servicios de dominio para encolar o sincronizar operaciones y no manipulará almacenamiento local directamente.

La lista de reportes, el detalle y el mapa mostrarán conectividad y cantidad de operaciones pendientes. El detalle expondrá controles de sincronización y reintento. La UI se actualiza después de una confirmación del servidor o refleja explícitamente una acción como pendiente.

### API

Los endpoints de campo comprobarán que el reclamo de cuadrilla del JWT coincide con la cuadrilla asignada al reporte. También aplicarán las transiciones de estado permitidas y las reglas de disponibilidad. La API no confiará en la validación de la app.

## Reglas de negocio

| Regla | Comportamiento |
| --- | --- |
| Transición de reporte | Solo `Asignado → Levantando información → En proceso → Completado`. |
| GPS | Solo se registra para `Levantando información` o `En proceso`; se detiene al completar. |
| Evidencia para completar | Debe existir una evidencia de resolución confirmada o en cola local. |
| Disponibilidad | Una cuadrilla con reportes activos no puede declararse `Disponible`. |
| Autoridad | La API calcula y valida el resultado final de estado y disponibilidad. |
| Error transitorio | La operación se conserva y se reintenta. |
| Error de validación | La operación queda identificada como fallida y requiere corrección o descarte explícito. |

## Contratos

No se sustituirán las rutas ya implantadas:

- `PUT /api/reportes/{id}/estatus`
- `POST /api/reportes/{id}/evidencias`
- `POST /api/reportes/{id}/ubicaciones`
- `PUT /api/cuadrillas/{id}/disponibilidad`

El contrato de ubicaciones permanece como `{ ubicaciones: [{ latitud, longitud }] }`. Las validaciones de autorización y transición pueden cambiar códigos de respuesta, pero no el formato válido de las solicitudes.

## Manejo de errores

- Sin red, timeout o `5xx`: conservar la operación, informar que quedó pendiente y reintentar posteriormente.
- `400` o `409`: mostrar el motivo del servidor, marcar el elemento como fallido y detener los elementos dependientes del mismo reporte cuando corresponda.
- `401` o `403`: conservar la cola y solicitar autenticación; no descartar datos de campo.
- Fallo de evidencia local: informar antes de encolar; no marcar como lista para completar hasta poder conservar el archivo.

## Pruebas y verificación

- Pruebas de cola: persistencia, orden, reintento, fallos terminales y eliminación tras confirmación.
- Pruebas de agrupación GPS y contratos HTTP.
- Pruebas de transiciones, evidencia requerida y disponibilidad.
- Pruebas unitarias de API para pertenencia de cuadrilla y reglas de dominio.
- Verificación final: pruebas, typecheck y lint de AppCuadrilla; pruebas y build de la API.

## Criterios de aceptación

1. Una cuadrilla puede registrar acciones sin red y sincronizarlas sin perderlas al reiniciar la aplicación.
2. Ubicaciones acumuladas se mandan al backend en lotes válidos.
3. La aplicación no ofrece transiciones inválidas y la API las rechaza aun si se solicita directamente.
4. Completar requiere evidencia de resolución confirmada o pendiente de sincronizar.
5. Una cuadrilla no puede exponerse como disponible si tiene trabajo activo.
6. Un JWT de una cuadrilla no puede operar reportes ajenos.
