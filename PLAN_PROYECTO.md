# Estado del proyecto — operación de AppCuadrilla

**Fecha de corte:** 14 de octubre de 2026
**Documento interno de planeación.** Este corte actualiza únicamente la fase de operación de AppCuadrilla y las validaciones API asociadas. El estado de PanelAdmin, AppCiudadano y el despliegue general no se revaluó aquí.

## Estado de la fase

| Área | Estado verificado | Pendiente |
| --- | --- | --- |
| Cola local de AppCuadrilla | Implementada para estados, evidencias, ubicaciones y disponibilidad, con evidencia durable y aislamiento por cuenta | Validación funcional en dispositivo |
| Sincronización | Reintento por reconexión, sesión y acción manual; relevo seguro de sesión, pasada posterior y resolución explícita de rechazos implementados | Validación funcional con API y dispositivo |
| API de operaciones de cuadrilla | Validaciones, autorización administrativa, reintentos idempotentes y protección transaccional de disponibilidad implementadas | Ejecutar la prueba de concurrencia con SQL Server dedicado en CI y validar el despliegue |
| Interfaz de campo | Indicador de pendientes/rechazos, siguiente estado permitido, evidencia de resolución, GPS y disponibilidad integrados | QA táctil, permisos y segundo plano en Android/iOS |

Las tareas 1–8 y las remediaciones posteriores P1/P2 están implementadas y revisadas en código: persistencia de evidencias, propiedad por cuenta, ciclo de vida GPS, resolución operativa de rechazos, sincronización concurrente, autorización administrativa y consistencia de disponibilidad. El escenario manual en dispositivo sigue **pendiente**; por ello, la fase no se declara validada para uso de campo.

## Evidencia de verificación de este corte

- AppCuadrilla: `npm test` aprobó 6 archivos de prueba, sin fallos; `npx tsc --noEmit` aprobó; `npx expo lint` aprobó con 3 advertencias por imports sin usar, sin errores.
- API: `dotnet test Sistema/API.Tests/ARJE.Api.Tests.csproj --no-restore` aprobó 71 de 71 pruebas; `dotnet build Sistema/API/ARJE.Api.csproj` terminó con 0 errores. NuGet emitió `NU1900` porque no pudo consultar el feed de vulnerabilidades.
- No se ejecutó `Sistema/API/test_api.py`: ese script modifica una base de datos local o activa. Las pruebas automatizadas anteriores no sustituyen la validación funcional en dispositivo.

## Límites y siguiente fase

1. Ejecutar en dispositivo el recorrido: autenticar → desconectar → guardar estado, evidencia y ubicación → reiniciar → reconectar → reintentar → confirmar en API un lote válido antes de completar. Verificar permisos y conservación de la URI de evidencia. Registrar dispositivo, sistema operativo y resultado por paso.
2. Configurar `ARJE_SQLSERVER_TEST_CONNECTION` con una base SQL Server dedicada y migrada en CI para ejecutar la prueba de concurrencia real.
3. Validar los flujos de UI de Android/iOS, GPS en segundo plano y cambios de cuenta en dispositivo. Las lecturas iniciales de datos del servidor requieren conexión; sin ella, la lista puede mostrar un error genérico o contenido vacío. Las operaciones en cola se conservan localmente.

La guía operativa y los límites técnicos están en [Sistema/AppCuadrilla/README.md](Sistema/AppCuadrilla/README.md).
