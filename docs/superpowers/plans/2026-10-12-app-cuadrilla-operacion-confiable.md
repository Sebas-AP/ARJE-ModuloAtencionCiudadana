# AppCuadrilla: operación de campo confiable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer durables sin red las operaciones de campo y validar en API su autorización y reglas.

**Architecture:** La app persiste operaciones FIFO tipadas y `syncService` las entrega en orden agrupando GPS. La API valida pertenencia de cuadrilla, transición de reporte, evidencia y disponibilidad.

**Tech Stack:** Expo SDK 51, TypeScript, AsyncStorage, NetInfo, ASP.NET Core 8, EF Core, xUnit.

**Spec:** `docs/superpowers/specs/2026-10-12-app-cuadrilla-operacion-confiable-design.md`

## Global Constraints

- Preservar rutas actuales y payload GPS `{ ubicaciones: [{ latitud, longitud }] }`.
- Consultar docs Expo SDK 51 antes de cambiar APIs Expo/React Native.
- No descartar operaciones por red, `5xx`, ni sesión expirada.
- Conservar evidencia local hasta confirmación del servidor.
- No implementar nube, push ni PanelAdmin; preservar el cambio local de `tsconfig.json`.

## Review Focus

- Un cierre durante GPS conserva puntos sin confirmar; Task 4 lo prueba.
- Un `401` conserva cola y exige autenticación; Task 4 lo prueba.
- JSON corrupto no rompe carga; Task 3 lo prueba.
- Una cuadrilla no opera reporte ajeno; Task 6 lo prueba.
- No se completa sin evidencia; Task 6 lo prueba.

---

## File structure

| File | Responsibility |
| --- | --- |
| `Sistema/AppCuadrilla/src/services/offlineQueue.ts` | Tipos, persistencia y reintentos. |
| `Sistema/AppCuadrilla/src/services/syncService.ts` | Entrega ordenada y lotes GPS. |
| `Sistema/AppCuadrilla/src/services/connectivityService.ts` | Suscripción NetInfo. |
| `Sistema/AppCuadrilla/src/services/api.ts` | HTTP tipado de campo. |
| `Sistema/AppCuadrilla/src/services/reportesService.ts` | Acciones de reporte encoladas. |
| `Sistema/AppCuadrilla/src/services/locationService.ts` | Tarea GPS que encola. |
| `Sistema/AppCuadrilla/src/components/SyncStatus.tsx` | Conectividad y pendientes. |
| `Sistema/AppCuadrilla/src/components/DisponibilidadSelector.tsx` | Disponibilidad. |
| `Sistema/API/Servicios/FieldOperationPolicy.cs` | Reglas de dominio. |
| `Sistema/API.Tests/` | Pruebas xUnit. |

### Task 1: Preparar dependencias y prueba de cola

**Files:** Modify `Sistema/AppCuadrilla/package.json`, lockfile; create `Sistema/AppCuadrilla/tests/offlineQueue.test.ts`.

- [ ] **Step 1: Consultar docs SDK 51 y escribir prueba fallida**

```ts
test('stores field operation before sending', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'status', reportId: 19, status: 3 });
  assert.equal((await queue.list()).length, 1);
});
```

- [ ] **Step 2: Ejecutar prueba**

Run: `npm test -- --test-name-pattern "stores field operation"`

Expected: FAIL porque no existe `createMemoryQueue`.

- [ ] **Step 3: Instalar dependencias**

Run: `npx expo install @react-native-async-storage/async-storage @react-native-community/netinfo`

Expected: versiones compatibles con Expo SDK 51.

- [ ] **Step 4: Commit**

Run: `git add Sistema/AppCuadrilla/package.json Sistema/AppCuadrilla/package-lock.json Sistema/AppCuadrilla/tests/offlineQueue.test.ts && git commit -m "chore: preparar sincronizacion offline de cuadrillas"`

### Task 2: Implementar dominio de cola persistente

**Files:** Create `Sistema/AppCuadrilla/src/services/offlineQueue.ts`; modify `tests/offlineQueue.test.ts`.

**Produces:** `QueuedOperation`, `QueueStore`, `createOfflineQueue`, `enqueue`, `list`, `markFailed`, `remove`.

- [ ] **Step 1: Escribir pruebas fallidas de orden/reintento**

```ts
await queue.enqueue({ kind: 'location', reportId: 8, latitud: 21.8, longitud: -102.3 });
await queue.enqueue({ kind: 'status', reportId: 8, status: 3 });
assert.deepEqual((await queue.list()).map(x => x.kind), ['location', 'status']);
await queue.markFailed((await queue.list())[0].id, 'sin red', false);
assert.equal((await queue.list())[0].attempts, 1);
```

- [ ] **Step 2: Ejecutar prueba**

Run: `npm test -- --test-name-pattern "order|retry"`

Expected: FAIL por exportaciones inexistentes.

- [ ] **Step 3: Implementar tipos mínimos**

```ts
export type QueuedOperation =
  | { id: string; createdAt: string; attempts: number; kind: 'location'; reportId: number; latitud: number; longitud: number }
  | { id: string; createdAt: string; attempts: number; kind: 'status'; reportId: number; status: 3 | 4 | 5 }
  | { id: string; createdAt: string; attempts: number; kind: 'evidence'; reportId: number; uri: string; name: string; mimeType: string }
  | { id: string; createdAt: string; attempts: number; kind: 'availability'; availability: 1 | 2 | 3 };
```

Generate ID with `crypto.randomUUID()` plus fallback; persist JSON; record `lastError` and `terminal`.

- [ ] **Step 4: Verificar y commit**

Run: `npm test -- tests/offlineQueue.test.ts`

Expected: PASS.

Run: `git add Sistema/AppCuadrilla/src/services/offlineQueue.ts Sistema/AppCuadrilla/tests/offlineQueue.test.ts && git commit -m "feat: persistir operaciones de campo"`

### Task 3: Añadir AsyncStorage y recuperación segura

**Files:** Modify `offlineQueue.ts`, `tests/offlineQueue.test.ts`.

**Produces:** `asyncStorageQueueStore` y `loadValidOperations(raw)`.

- [ ] **Step 1: Escribir pruebas fallidas**

```ts
assert.deepEqual(loadValidOperations('{malformed'), []);
assert.deepEqual(loadValidOperations('[{"kind":"unknown"}]'), []);
```

- [ ] **Step 2: Ejecutar prueba**

Run: `npm test -- --test-name-pattern "malformed|unknown"`

Expected: FAIL porque no existe `loadValidOperations`.

- [ ] **Step 3: Implementar adaptador**

```ts
export const asyncStorageQueueStore: QueueStore = {
  read: () => AsyncStorage.getItem('arje_field_operation_queue'),
  write: value => AsyncStorage.setItem('arje_field_operation_queue', value),
};
```

Validar tipo, `kind`, `reportId` y números; excluir registros inválidos.

- [ ] **Step 4: Verificar y commit**

Run: `npm test -- tests/offlineQueue.test.ts`

Expected: PASS.

Run: `git add Sistema/AppCuadrilla/src/services/offlineQueue.ts Sistema/AppCuadrilla/tests/offlineQueue.test.ts && git commit -m "feat: recuperar cola offline de forma segura"`

### Task 4: Sincronizar cola y conectividad

**Files:** Create `syncService.ts`, `connectivityService.ts`; modify `tests/offlineQueue.test.ts`.

**Produces:** `syncPendingOperations`, `groupLocations`, `subscribeToConnectivity`, `SyncResult`.

- [ ] **Step 1: Escribir pruebas fallidas**

```ts
const result = await syncPendingOperations(dependencies);
assert.deepEqual(sentBatches, [{ reportId: 5, ubicaciones: [{ latitud: 1, longitud: 2 }, { latitud: 3, longitud: 4 }] }]);
assert.equal(result.pending, 0);
```

Agregar casos de red/`5xx` (retiene), `401` (requiere login), y `400` (terminal).

- [ ] **Step 2: Ejecutar prueba**

Run: `npm test -- --test-name-pattern "batch|401|400"`

Expected: FAIL porque no existe el servicio.

- [ ] **Step 3: Implementar sincronización**

```ts
export interface SyncResult { sent: number; pending: number; failed: number; requiresAuthentication: boolean; }
export const groupLocations = (items: QueuedOperation[]) => /* puntos consecutivos del mismo reporte */;
```

Procesar FIFO; borrar solo tras éxito; detener dependencias después de error terminal de estado; clasificar `401/403`, `400/409`, red/`5xx`.

- [ ] **Step 4: Verificar y commit**

Run: `npm test -- tests/offlineQueue.test.ts`

Expected: PASS.

Run: `git add Sistema/AppCuadrilla/src/services/syncService.ts Sistema/AppCuadrilla/src/services/connectivityService.ts Sistema/AppCuadrilla/tests/offlineQueue.test.ts && git commit -m "feat: sincronizar operaciones de campo pendientes"`

### Task 5: Enrutar acciones móviles por la cola

**Files:** Modify `api.ts`, `reportesService.ts`, `locationService.ts`, `fieldApiContract.ts`, `authService.ts`, `tests/fieldApiContract.test.ts`.

- [ ] **Step 1: Escribir prueba de contrato fallida**

```ts
assert.equal(fieldApiPaths.disponibilidad(8), '/cuadrillas/8/disponibilidad');
assert.deepEqual(buildLocationBatch([{ latitud: 21.8, longitud: -102.3 }]), { ubicaciones: [{ latitud: 21.8, longitud: -102.3 }] });
```

- [ ] **Step 2: Ejecutar prueba**

Run: `npm test -- tests/fieldApiContract.test.ts`

Expected: FAIL por ruta y builder ausentes.

- [ ] **Step 3: Implementar API tipada y queue-first**

```ts
export const updateAvailability = (id: number, estatusDisponibilidad: 1 | 2 | 3) =>
  apiRequest<void>(fieldApiPaths.disponibilidad(id), { method: 'PUT', body: JSON.stringify({ estatusDisponibilidad }) });
```

GPS de background encola, nunca usa `fetch`; estado/evidencia encolan y sincronizan; login/restauración disparan sync.

- [ ] **Step 4: Verificar y commit**

Run: `npm test -- tests/fieldApiContract.test.ts tests/offlineQueue.test.ts`

Expected: PASS.

Run: `git add Sistema/AppCuadrilla/src/services Sistema/AppCuadrilla/tests && git commit -m "feat: encolar acciones operativas de cuadrilla"`

### Task 6: Validar operaciones en API

**Files:** Create `Sistema/API/Servicios/FieldOperationPolicy.cs`, `Sistema/API.Tests/ARJE.Api.Tests.csproj`, `FieldOperationPolicyTests.cs`; modify reportes, seguimientos y cuadrillas controllers.

- [ ] **Step 1: Crear pruebas xUnit fallidas**

```csharp
[Fact] public void Rejects_completion_without_resolution_evidence() =>
    Assert.False(policy.EnsureCanComplete(reporteSinEvidencia).IsAllowed);
[Fact] public void Rejects_foreign_cuadrilla() =>
    Assert.False(policy.EnsureAssignedToAuthenticatedCuadrilla(reporteDeLaDos, 1).IsAllowed);
```

Cubrir tres transiciones, salto inválido y disponibilidad con reporte activo.

- [ ] **Step 2: Ejecutar prueba**

Run: `dotnet test Sistema/API.Tests/ARJE.Api.Tests.csproj --filter FieldOperationPolicyTests`

Expected: FAIL por política inexistente.

- [ ] **Step 3: Implementar política/controladores**

```csharp
public bool IsAllowedTransition(EstatusReporte from, EstatusReporte to) => (from, to) is
  (EstatusReporte.Asignado, EstatusReporte.LevantandoInformacion) or
  (EstatusReporte.LevantandoInformacion, EstatusReporte.EnProceso) or
  (EstatusReporte.EnProceso, EstatusReporte.Completado);
```

Tomar `ClaimTypes.NameIdentifier`, responder `Forbid()` al reporte ajeno, exigir `TipoEvidencia.Resolucion`, recalcular disponibilidad.

- [ ] **Step 4: Verificar y commit**

Run: `dotnet test Sistema/API.Tests/ARJE.Api.Tests.csproj --filter FieldOperationPolicyTests`

Expected: PASS.

Run: `git add Sistema/API/Servicios/FieldOperationPolicy.cs Sistema/API/Controllers Sistema/API.Tests && git commit -m "feat(api): validar operaciones de cuadrilla"`

### Task 7: Mostrar sincronización y disponibilidad

**Files:** Create `SyncStatus.tsx`, `DisponibilidadSelector.tsx`; modify `StatusSelector.tsx`, detalle, lista, mapa y tabs.

- [ ] **Step 1: Escribir prueba de estados permitidos**

```ts
assert.deepEqual(getAllowedNextStatuses(2), [3]);
assert.deepEqual(getAllowedNextStatuses(4), [5]);
assert.deepEqual(getAllowedNextStatuses(5), []);
```

- [ ] **Step 2: Ejecutar prueba**

Run: `npm test -- --test-name-pattern "allowed next statuses"`

Expected: FAIL porque no existe el helper.

- [ ] **Step 3: Implementar UI**

```tsx
<SyncStatus isOnline={isOnline} pendingCount={pendingCount} onRetry={syncNow} />
```

Mostrar solo siguiente estado válido, bloquear completar sin evidencia subida/encolada, incluir indicador en tabs/detalle y deshabilitar `Disponible` con trabajo activo.

- [ ] **Step 4: Verificar y commit**

Run: `npm test -- --test-name-pattern "allowed next statuses"`

Expected: PASS.

Run: `git add Sistema/AppCuadrilla/src/components Sistema/AppCuadrilla/src/app Sistema/AppCuadrilla/tests && git commit -m "feat: mostrar estado de sincronizacion de cuadrilla"`

### Task 8: Verificar y documentar

**Files:** Modify `Sistema/AppCuadrilla/README.md`, `PLAN_PROYECTO.md`.

- [ ] **Step 1: Documentar operación offline**

Documentar creación de cola, reconexión/reintento manual, fallos de validación y preservación de datos.

- [ ] **Step 2: Verificar móvil**

Run: `npm test && npx tsc --noEmit && npx expo lint` (en `Sistema/AppCuadrilla`)

Expected: PASS.

- [ ] **Step 3: Verificar API**

Run: `dotnet test Sistema/API.Tests/ARJE.Api.Tests.csproj && dotnet build Sistema/API/ARJE.Api.csproj`

Expected: PASS.

- [ ] **Step 4: Validar en dispositivo**

Autenticar, desconectar, crear estado/evidencia/ubicación, reiniciar, reconectar, reintentar y confirmar un lote válido antes de completar.

- [ ] **Step 5: Commit**

Run: `git add Sistema/AppCuadrilla/README.md PLAN_PROYECTO.md && git commit -m "docs: describir operacion offline de cuadrillas"`

## Plan self-review

- **Spec coverage:** Tasks 2–5 implementan persistencia, reintento, lote, evidencia y disponibilidad; Task 6 aplica autoridad API; Task 7 presenta estado; Task 8 verifica.
- **Placeholder scan:** Cada tarea tiene archivos, prueba, comando y resultado esperado.
- **Type consistency:** `QueuedOperation`, `SyncResult` y `ubicaciones` son contratos únicos.
- **Review Focus coverage:** Tasks 3, 4 y 6 cubren cada condición crítica.
