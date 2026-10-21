# Estado del proyecto — recorrido integrado ciudadano → admin → cuadrilla

**Fecha de corte:** 20 de octubre de 2026  
**Documento interno de planeación.** Este corte actualiza el recorrido completo: ciudadano crea reporte → admin asigna → cuadrilla atiende → tres vistas reflejan resultado real.

## Estado general por componente

| Componente | Estado | Última validación |
|------------|--------|-------------------|
| **API (ASP.NET Core 8)** | ✅ Funcional | 2026-10-20: 79/79 tests pasan, build OK |
| **PanelAdmin (React + Vite)** | ✅ Funcional | 2026-10-20: 3/3 tests pasan, build OK, lint OK |
| **AppCiudadano (React Native/Expo)** | ✅ Funcional | 2026-10-20: TypeScript OK, lint OK |
| **AppCuadrilla (React Native/Expo Router)** | ✅ Funcional | 2026-10-20: TypeScript OK, lint 1 warning |

## Funcionalidades completadas (recorrido crítico)

### A. Contrato Ciudadano–API–Panel–Cuadrilla ✅
- **GET /api/reportes/consulta** público con DTO seguro (sin teléfono, IA, GPS, cuadrillas)
- **GET /reportes/{id}/publico** y **/evidencias/publico** para consulta ciudadana
- **GET /reportes** autenticado filtra por JWT cuadrilla (aislamiento estricto)
- AppCiudadano usa endpoints públicos; PanelAdmin usa endpoints autenticados
- DTOs y enums consistentes (Nuevo=1..Cerrado=7); ciudadano ve "Resuelto" para Completado
- Invalidación de caché en mutaciones; refresh automático en PanelAdmin y AppCiudadano

### B. Dictado por voz ✅
- Hook `useSpeechRecognition` con soporte nativo (expo-speech-recognition) y web (Web Speech API)
- Español (es-MX preferido, fallback es-ES)
- Iniciar/detener/cancelar/confirmar; texto provisional y final
- Timer sincronizado con eventos reales; limpieza en unmount
- Manejo de permiso denegado, servicio ausente, silencio; fallback a escritura manual

### C. Fotos y evidencias extremo a extremo ✅
- **Cámara/Galería** con vista previa, eliminación, permisos en ambas apps
- **Multipart** correcto nativo (FormData RN) y web (Blob/File via fetch)
- **Evidencia ciudadana anónima**: token JWT limitado (60 min, scope reporteId) al crear reporte
- **Validación servidor**: MIME real (magic bytes), tamaño máx 10MB, tipo permitido, pertenencia a reporte
- **UseStaticFiles** configurado; URLs relativas funcionan en LAN (no localhost en dispositivo)
- **Transacción**: rollback de archivo si falla BD; sin archivos huérfanos
- **Estados UI**: "Guardado en dispositivo" vs "Recibido por servidor"; reintento selectivo de fotos fallidas
- **Fotos reales** en PanelAdmin, AppCiudadano, AppCuadrilla (sin fuga-ejemplo.png)
- **Evidencias durables**: nativo (expo-file-system), web (IndexedDB via webImageStorage.ts)

### D. Mapas, ubicación y seguimiento ✅
- **AppCiudadano**: GPS + corrección manual en mapa; fallback coordenadas solo si usuario confirma
- **AppCuadrilla nativo**: react-native-maps + Google Maps; GPS foreground/background; ciclo vida (LevantandoInformacion/EnProceso → stop en Completado)
- **AppCuadrilla web**: Pantalla informativa (pendiente Leaflet/MapLibre para mapa interactivo)
- **PanelAdmin**: Posiciones reales de cuadrillas vía `/api/reportes/{id}/ubicaciones/ultima`; sin coordenadas fabricadas
- **Filtros mapa**: Enums numéricos correctos; callback tipado; selección de reporte funcional
- **GPS ciclo vida**: Inicia en LevantandoInformacion/EnProceso; detiene en Completado; cola offline; recuperación tras reinicio
- **Historial vs ruta**: PanelAdmin showRouteLine = línea recta (no ruta calculada); historial real en SeguimientosUbicacion
- **Configuración documentada**: Google Maps API Key, permisos iOS/Android, atribución OSM/Google

### E. Sincronización ciudadana sin pérdidas ✅
- **Persistencia durable**: AsyncStorage + idempotency key para deduplicación
- **Etapas**: creación → remoteId → evidencia pendiente (no re-crea reporte)
- **Errores diferenciados**: transient (reintento) vs auth/validation (acción manual)
- **Sin borrado en max retries**: marca failed, retiene para revisión manual
- **Serialización cola**: lock via syncLock; finally para cleanup
- **UI estados**: "Pendiente sincronización" / "Sincronizado" / "Error - Reintentar/Corregir/Descartar"
- **Patrones AppCuadrilla**: operaciones tipadas, owner por cuenta, recovery policy

### F. PanelAdmin modo real con métricas ✅
- **Modo estricto**: login sin fallback mock; getById sin fallback; errores propagados
- **Mutaciones persistidas**: asignar/estatus/tiempo → refresh API; sin cambios solo locales
- **Paginación real**: total desde header `x-total-count`; búsqueda delegada a API
- **Métricas reales**: calculadas en servidor (computeMetrics, computeGraficaMes, computeCategorias, computeCuadrillasRendimiento)
- **FechaResolucion**: persistida al completar; métricas "resueltos hoy" usan fecha real
- **Refresh**: tras mutaciones + intervalo 60s + focus; sin race conditions

### G. AppCuadrilla mejoras ✅
- **Evidencias durables web**: IndexedDB (webImageStorage.ts) para persistencia tras recargar
- **Mapa nativo**: react-native-maps + Google Maps; GPS foreground/background funcional
- **Documentación mapa**: README actualizado con proveedores, claves, permisos, atribución
- **Evidencias durables**: híbrido nativo (expo-file-system) / web (IndexedDB)

## Pendientes (fuera de alcance crítico)

| Área | Descripción | Bloqueo |
|------|-------------|---------|
| **Audio adjunto** | Captura, permisos, reproducción, subida, reproducción autorizada | Requiere decisión de producto: ¿sustituye foto resolución? |
| **Notificaciones push** | Registro dispositivo, asociación reportes, envío cambio estado | Requiere credenciales FCM/APNs, proyecto EAS, proveedor |
| **Mapa web interactivo** | Leaflet/MapLibre GL JS en AppCuadrilla web | Baja prioridad; nativo cubre operación de campo |
| **Validación dispositivo físico** | Permisos, cámara, GPS background, archivos tras reinicio | Requiere dispositivo Android/iOS físico |
| **Prueba concurrencia SQL Server** | Test con ARJE_SQLSERVER_TEST_CONNECTION en CI | Requiere SQL Server dedicado en CI |
| **Migración cero + datos** | Test ReporteSchemaMigrationTests contra SQLite + SQL Server | Pendiente ejecución en CI |

## Evidencia de validación (corte 2026-10-20)

- **API**: `dotnet test Sistema/API.Tests/ARJE.Api.Tests.csproj` → 79/79 ✅ | `dotnet build` → 0 errores ✅
- **PanelAdmin**: `npm test` → 3/3 ✅ | `npm run build` ✅ | `npm run lint` ✅
- **AppCuadrilla**: `npx tsc --noEmit` ✅ | `npx expo lint` → 1 warning (require import) ✅
- **AppCiudadano**: `npx tsc --noEmit` ✅ | `npx expo lint` ✅

## Próximos pasos recomendados

1. **Validación en dispositivo físico**: Android/iOS con permisos reales, GPS background, cámara, archivos tras reinicio
2. **Configurar CI**: `ARJE_SQLSERVER_TEST_CONNECTION` para test de concurrencia real
3. **Audio/Notificaciones**: Decidir alcance (fase 2) y configurar EAS/FCM/APNs si procede
3. **Mapa web**: Implementar Leaflet en `MapaScreen.web.tsx` si se requiere paridad web
4. **Actualizar MANUAL_TECNICO.md** y `docs/ESTADO_IMPLEMENTACION.md` para reflejar estado final