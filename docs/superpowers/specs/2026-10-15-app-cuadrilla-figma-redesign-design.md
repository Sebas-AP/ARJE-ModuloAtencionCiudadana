# Rediseño de AppCuadrilla desde Figma

## Objetivo

Reproducir en `Sistema/AppCuadrilla` las pantallas de cuadrillas del archivo Figma **Sistema Arje_ - Reportes**, conservando todos los comportamientos de operación de campo ya implementados.

La referencia visual se encuentra en la página `Page 1` del archivo `WzTzwCMRbk4l0Ro9YQDpEd`, principalmente en estos frames:

| Frame Figma | Nodo | Destino en la app |
| --- | --- | --- |
| Login Cuadrilla | `86:8` | `src/app/(auth)/login.tsx` |
| Reportes asignados | `89:135` | `src/app/(tabs)/index.tsx` y `ReporteCard` |
| Detalles reporte | `117:274`, `117:423` | `src/app/reporte/[id].tsx` |
| Completar reporte | `117:475` | flujo de resolución en detalle |
| Completar reporte (audio) | `125:582` | estado de captura de audio del flujo de resolución |
| Reportie completado | `117:531` | confirmación posterior al cambio a completado |

## Alcance visual

La interfaz usará el sistema extraído de los frames: fondo gris muy claro (`#F7F9FC`), azul primario ARJE, tarjetas con borde azul pálido y radio de 18 px, botones principales azules, etiquetas de estatus redondeadas y tipografía Inria Sans. Se usarán los recursos estáticos proporcionados por Figma, descargados al proyecto cuando corresponda; no se conservarán URL temporales de Figma en el código.

Las pantallas se implementarán como diseño nativo React Native, adaptable a anchuras de teléfono, no como coordenadas absolutas ni como imágenes de las pantallas. Los iconos se expresarán con el conjunto de iconos ya instalado cuando sea la correspondencia exacta; los recursos de marca e ilustraciones se usarán desde archivos locales.

El mapa no tiene frame de cuadrillas en la referencia. Seguirá disponible y se alineará con los mismos tokens de color, navegación y superficies, sin cambiar su comportamiento cartográfico.

## Arquitectura de interfaz

Se centralizarán los colores, radios, espaciados y textos tipográficos del rediseño en un módulo de tema para evitar estilos visuales divergentes. Los componentes se responsabilizarán de una pieza visual reutilizable:

- `ReporteCard`: encabezado de folio, estatus, categoría, fecha y navegación al detalle.
- Controles de búsqueda y filtro: búsqueda local por folio, tipo, sector y estatus sin modificar la fuente remota de datos.
- Componentes de detalle: cabecera, ficha de tiempo, descripción, evidencia y acciones de campo.
- Acciones de resolución: descripción de trabajo, evidencia fotográfica, acceso a la captura de audio disponible y estado de confirmación.

Las rutas actuales se conservan: login, tabs de reportes/mapa y detalle por id. El detalle mantiene scroll accesible y acciones fijadas o visibles sin ocultar contenido tras la barra inferior.

## Preservación de flujos de campo

No se modificará el contrato de API ni las políticas de operación. El nuevo diseño seguirá utilizando:

- `authService` para la autenticación;
- `reportesService` para carga, cambios de estatus y evidencias;
- `fieldUiPolicy` para transiciones permitidas y el requisito de evidencia antes de completar;
- `useFieldSync` y la cola offline para el estado y recuperación de sincronización;
- `useLocation` para seguimiento GPS;
- `EvidenciaUploader` y permisos de Expo para cámara y galería.

Los estados de carga, vacío, fallo, operación en cola, sincronización rechazada y permiso denegado se presentarán con el mismo sistema visual. El usuario no podrá activar acciones incompatibles mientras una operación esté pendiente o el estado no se haya confirmado, como sucede actualmente.

## Pruebas y verificación

Se introducirán pruebas centradas en los comportamientos añadidos o reorganizados: búsqueda y filtrado local, conversión de datos de reporte a tarjeta y visibilidad/inhabilitación de las acciones de resolución. Cada cambio de comportamiento seguirá ciclo rojo-verde-refactor.

Al final se ejecutarán la suite de Node existente, `npm run typecheck` y `npm run lint` desde `Sistema/AppCuadrilla`. Las vistas modificadas se verificarán también contra las capturas del Figma; se revisará que cada activo estático visible tenga archivo local no vacío, callsite y geometría efectiva correctos.

## Fuera de alcance

- Cambios a API, base de datos, autorización o semántica de estatus.
- Creación de pantallas que no existen en el diseño ni en la app, salvo los estados necesarios para operaciones reales.
- Alterar el archivo de Figma.
