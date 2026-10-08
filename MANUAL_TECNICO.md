# Manual Técnico — ARJE Módulo de Atención Ciudadana

**Versión:** 1.0
**Fecha:** Octubre 2026
**Proyecto:** Sistema integral para la gestión de reportes de agua potable
**Organización:** ARJE / Evolsoft

---

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Componentes del Sistema](#3-componentes-del-sistema)
4. [Backend — API (ASP.NET Core)](#4-backend--api-aspnet-core)
5. [Frontend — Panel de Administración (React + Vite)](#5-frontend--panel-de-administración-react--vite)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Referencia de la API REST](#7-referencia-de-la-api-rest)
8. [Servicio de Clasificación con IA (NVIDIA)](#8-servicio-de-clasificación-con-ia-nvidia)
9. [Configuración y Despliegue](#9-configuración-y-despliegue)
10. [Seguridad y Autenticación](#10-seguridad-y-autenticación)
11. [Reglas de Negocio](#11-reglas-de-negocio)
12. [Diagramas de Referencia](#12-diagramas-de-referencia)

---

## 1. Descripción General

El **Módulo de Atención Ciudadana ARJE** es un sistema integral para la recepción, clasificación, asignación, atención y supervisión de reportes ciudadanos relacionados con el servicio de agua potable (fugas, falta de abastecimiento, instalaciones rotas, uso indebido, etc.).

### Características principales

- Recepción de reportes con geolocalización (latitud/longitud).
- **Clasificación automática de reportes mediante IA** (NVIDIA Llama 3.2 Vision) con sistema de respaldo heurístico.
- **Priorización inteligente** en 4 niveles: Baja, Media, Alta y Crítica.
- Gestión de cuadrillas de campo con control de disponibilidad.
- Evidencias fotográficas (iniciales y de resolución).
- Seguimiento GPS en tiempo real de las cuadrillas durante la atención.
- Supervisión cruzada de trabajos (RF-13: la cuadrilla supervisora debe ser distinta a la que atendió).
- Panel administrativo web con dashboard, mapa, indicadores y gestión operativa.

---

## 2. Arquitectura del Sistema

El sistema sigue una arquitectura **cliente-servidor de n capas**:

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   AppCiudadano      │  │   AppCuadrilla      │  │   PanelAdmin        │
│   (React Native/    │  │   (App móvil de     │  │   (React + Vite,    │
│    Expo)            │  │    campo)           │  │    TypeScript)      │
└─────────┬───────────┘  └─────────┬───────────┘  └─────────┬───────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │ HTTP/REST (JSON)
                          ┌────────▼─────────┐
                          │   API Backend    │
                          │  ASP.NET Core 8  │
                          │  (Controllers +  │
                          │   EF Core)       │
                          └────────┬─────────┘
                ┌──────────────────┼──────────────────┐
       ┌────────▼────────┐  ┌──────▼──────┐   ┌───────▼────────┐
       │  SQL Server /   │  │ Almacén de  │   │  NVIDIA API    │
       │  SQLite (dev)   │  │ archivos    │   │  (Llama 3.2    │
       │  (EF Core)      │  │ local       │   │  Vision)       │
       └─────────────────┘  └─────────────┘   └────────────────┘
```

### Patrones utilizados

- **MVC / Controladores REST** en el backend.
- **DTO (Data Transfer Objects)** para desacoplar entidades de persistencia de la API pública.
- **Repository implícito** mediante `DbContext` de Entity Framework Core.
- **Inyección de dependencias** nativa de ASP.NET Core.
- **AutoMapper** para el mapeo Entidad ↔ DTO.
- **Output Caching** por etiquetas (`reportes`, `cuadrillas`, `evidencias`, `ubicaciones`) con invalidación selectiva.
- **Herencia de controlador base** (`CustomBaseController<T, TCreacion, TDto>`) para CRUD genérico.

---

## 3. Componentes del Sistema

```
Sistema/
├── API/              # Backend REST (ASP.NET Core 8, C#)
├── AppCiudadano/     # App móvil para ciudadanos (React Native / Expo)
├── AppCuadrilla/     # App móvil para cuadrillas de campo
└── PanelAdmin/       # Panel web administrativo (React 19 + Vite + TypeScript)
```

| Componente   | Tecnología                    | Rol                                   |
|--------------|-------------------------------|---------------------------------------|
| API          | ASP.NET Core 8, EF Core, C#   | Servicios REST, lógica de negocio     |
| PanelAdmin   | React 19, Vite, TypeScript    | Administración, monitoreo, indicadores|
| AppCiudadano | React Native / Expo           | Creación y seguimiento de reportes    |
| AppCuadrilla | React Native                  | Atención de reportes en campo         |
| Base de datos| SQL Server (prod) / SQLite (dev) | Persistencia                       |
| IA           | NVIDIA NIM (Llama 3.2 Vision) | Clasificación y priorización          |

---

## 4. Backend — API (ASP.NET Core)

### 4.1 Stack tecnológico

| Paquete                                  | Versión | Propósito                          |
|------------------------------------------|---------|-------------------------------------|
| Microsoft.EntityFrameworkCore.SqlServer  | 8.0.10  | ORM para SQL Server (producción)   |
| Microsoft.EntityFrameworkCore.Sqlite     | 8.0.10  | ORM para SQLite (desarrollo local) |
| AutoMapper                               | 13.0.1  | Mapeo Entidad ↔ DTO                |
| Swashbuckle.AspNetCore                   | 6.6.2   | Documentación Swagger/OpenAPI      |
| NetTopologySuite                         | 2.5.0   | Soporte de datos geoespaciales     |
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.10 | Autenticación JWT             |
| BCrypt.Net-Next                          | 4.0.3   | Hash de contraseñas                |

**Framework destino:** `net8.0` (con builds experimentales en `net10.0`).

### 4.2 Estructura del proyecto API

```
Sistema/API/
├── Program.cs                  # Punto de entrada y configuración
├── ARJE.Api.csproj             # Definición del proyecto
├── appsettings.json            # Configuración (cadena de conexión, logs)
├── Entidades/                  # Modelos de dominio (EF Core)
│   ├── ApplicationDbContext.cs
│   ├── Reporte.cs
│   ├── Evidencia.cs
│   ├── Cuadrilla.cs
│   ├── SeguimientoUbicacion.cs
│   ├── UsuarioSistema.cs
│   ├── IId.cs
│   └── Enums/Tipos.cs
├── DTOs/                       # Objetos de transferencia
│   ├── Reporte/
│   ├── Cuadrilla/
│   ├── Evidencia/
│   ├── SeguimientoUbicacion/
│   └── Usuario/
├── Controllers/                # Controladores REST
│   ├── ReportesController.cs
│   ├── CuadrillasController.cs
│   ├── EvidenciasController.cs
│   ├── SeguimientosUbicacionController.cs
│   ├── UsuariosController.cs
│   ├── ClasificacionController.cs
│   └── CustomBaseController.cs
├── Servicios/                  # Servicios de infraestructura
│   ├── IClasificadorService.cs
│   ├── ClasificadorNvidiaService.cs
│   ├── IAlmacenadorArchivos.cs
│   └── AlmacenadorArchivosLocal.cs
├── Utilidades/                 # Helpers transversales
│   ├── AutoMapperProfiles.cs
│   ├── IQueryableExtensions.cs   # Paginación
│   ├── HttpContextExtensions.cs  # Headers de paginación
│   └── TypeBinder.cs
└── Migrations/                 # Migraciones EF Core
    ├── 20260924223638_InitialCreate.cs
    └── 20261001165548_AddPrioridadReporte.cs
```

### 4.3 Configuración de servicios (Program.cs)

El arranque configura:

1. **Persistencia**: decide en tiempo de ejecución entre SQLite (desarrollo, si la cadena termina en `.db`) o SQL Server.
2. **AutoMapper** con el perfil `AutoMapperProfiles`.
3. **OutputCache** con expiración por defecto de 60 segundos.
4. **CORS** permisivo (`permitirTodo`) — acepta cualquier origen, método, header y credenciales. *Nota: restringir en producción.*
5. **Almacenamiento de archivos**: `AlmacenadorArchivosLocal` para evidencias.
6. **Cliente HTTP para NVIDIA** con timeout de 10 segundos (fallback inmediato en redes lentas).
7. **Swagger** habilitado solo en desarrollo.
8. **Migraciones automáticas** al arrancar (`dbContext.Database.Migrate()`).

### 4.4 Caché de salida

Los endpoints de consulta utilizan caché por etiquetas:

| Etiqueta      | Invalidada por                                    |
|---------------|---------------------------------------------------|
| `reportes`    | Crear/actualizar/eliminar reportes o evidencias   |
| `cuadrillas`  | Cambios en cuadrillas o asignaciones              |
| `evidencias`  | Alta/baja de evidencias                           |
| `ubicaciones` | Registro de nuevas posiciones GPS                 |

---

## 5. Frontend — Panel de Administración (React + Vite)

### 5.1 Stack tecnológico

| Dependencia        | Versión | Propósito                              |
|--------------------|---------|----------------------------------------|
| React / React DOM  | 19.2.8  | Librería de UI                         |
| Vite               | 8.3.0   | Bundler y servidor de desarrollo       |
| TypeScript         | 6.0.2   | Tipado estático                        |
| Leaflet + react-leaflet | 1.9.4 / 5.0.0 | Mapas interactivos               |
| Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 | Gráficas de indicadores    |
| lucide-react       | 1.48.0  | Iconografía                            |
| blobatar           | 2.7.0   | Avatares de usuario                    |
| oxlint             | 1.81.0  | Linter                                 |

### 5.2 Estructura del proyecto PanelAdmin

```
Sistema/PanelAdmin/src/
├── App.tsx                 # Componente raíz, orquestación de estado global
├── main.tsx                # Punto de entrada
├── types/index.ts          # DTOs y enums alineados 1:1 con la API .NET
├── services/               # Capa de acceso a datos
│   ├── api.ts              # Cliente HTTP genérico + gestión de token JWT
│   ├── reportesService.ts
│   ├── cuadrillasService.ts
│   ├── indicadoresService.ts
│   ├── authService.ts
│   └── mockData.ts         # Datos de prueba para modo offline
├── screens/                # Pantallas principales
│   ├── LoginScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── ReportesScreen.tsx
│   ├── SeguimientoScreen.tsx
│   ├── MapaScreen.tsx
│   ├── CuadrillasScreen.tsx
│   └── IndicadoresScreen.tsx
└── components/             # Componentes reutilizables
    ├── Layout.tsx, Header.tsx, Sidebar.tsx
    ├── MapView.tsx
    ├── ModalAsignarCuadrilla.tsx
    ├── ModalCorregirCategoria.tsx
    ├── ModalProgramarSupervision.tsx
    ├── ModalNuevaCuadrilla.tsx
    ├── StatusBadge.tsx, CategoriaBadge.tsx, PrioridadBadge.tsx
    └── UserBlobatar.tsx
```

### 5.3 Flujo de datos y estado

`App.tsx` centraliza el estado operativo:

- **Autenticación** (`currentUser`): sesión del administrador vía `authService` (persistida en `localStorage`).
- **Datos** (`reportes`, `cuadrillas`, `metrics`): cargados con `Promise.all` al iniciar sesión y **refrescados automáticamente cada 60 segundos**.
- **Navegación** por pestañas: `dashboard`, `reportes`, `seguimiento`, `mapa`, `cuadrillas`, `indicadores`.
- **Modales globales**: asignación de cuadrilla, corrección de categoría, programación de supervisión, alta de cuadrilla.
- **Notificaciones toast**: feedback de éxito/error autodestruible (4 s).

### 5.4 Modo Offline (Mock Data)

El panel puede funcionar sin backend gracias al flag `USE_MOCK_DATA`:

```typescript
// services/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5170/api';
export let USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK === 'true';
```

- Se conmuta en tiempo de ejecución con `toggleMockData()` y persiste en `localStorage` (`arje_use_mock`).
- Para activar el backend real: definir `VITE_USE_MOCK=false` en `.env` y ejecutar la API.

### 5.5 Cliente HTTP

`apiClient<T>(endpoint, options)` encapsula `fetch` añadiendo:

- Header `Content-Type: application/json` (excepto con `FormData`).
- Header `Authorization: Bearer <token>` desde `localStorage` (`arje_admin_token`).
- Manejo de **401**: limpia la sesión y emite el evento `arje:unauthorized`.
- Manejo de **204**: retorna `null`.
- Errores: extrae `mensaje` del cuerpo de respuesta.

### 5.6 Variables de entorno del frontend

| Variable           | Descripción                          | Valor por defecto            |
|--------------------|--------------------------------------|------------------------------|
| `VITE_API_BASE_URL`| URL base de la API                   | `http://localhost:5170/api`  |
| `VITE_USE_MOCK`    | Activar datos de prueba              | `false`                      |

---

## 6. Modelo de Datos

### 6.1 Diagrama entidad-relación (lógico)

```
Cuadrillas ──────────┐
  | 1                |
  |                  | 0..* (asignada, SetNull)
  |                  ▼
  |              Reportes ──1──┬── 0..* Evidencias (Cascade)
  |                ▲           └── 0..* SeguimientosUbicacion (Cascade)
  |                | 0..* (supervisora, Restrict)
  └────────────────┘
SeguimientosUbicacion ──*..1──► Cuadrillas (Cascade)
UsuariosSistema (independiente)
```

### 6.2 Entidades

#### Reporte

| Campo                 | Tipo               | Descripción                                      |
|-----------------------|--------------------|--------------------------------------------------|
| Id                    | int (PK)           | Identificador autoincremental                    |
| TipoProblema          | enum               | Fuga, FaltaAbastecimiento, InstalacionRota, UsoIndebido, Otro |
| Categoria             | string(100)        | Categoría asignada por IA o corrección manual    |
| ConfianzaIA           | double?            | Confianza (0–1) de la clasificación IA           |
| RazonamientoIA        | string(500)        | Justificación de la categoría                    |
| Prioridad             | enum               | Baja, Media, Alta, Critica (default: Media)      |
| ScorePrioridad        | double?            | Puntaje de prioridad (0–1)                       |
| JustificacionPrioridad| string(500)        | Explicación de la prioridad                      |
| Descripcion           | string(2000)       | Descripción del ciudadano (requerida)            |
| Latitud / Longitud    | decimal(18,15)     | Georreferencia (requerida)                       |
| FechaRecibido         | DateTime           | Default UTC                                      |
| Estatus               | enum               | Ver ciclo de vida (§11)                          |
| TiempoEstimado        | decimal?           | Tiempo estimado de atención                      |
| IdCuadrillaAsignada   | int? (FK)          | Cuadrilla asignada (SetNull on delete)           |
| IdCuadrillaSupervisora| int? (FK)          | Cuadrilla supervisora (Restrict on delete)       |
| NumeroContrato        | string(50)         | Contrato del ciudadano                           |
| NombreCiudadano       | string(100)        | Nombre del reportante                            |
| TelefonoCiudadano     | string(20)         | Teléfono del reportante                          |

**Índices:** Estatus, Prioridad, IdCuadrillaAsignada, IdCuadrillaSupervisora, (Latitud, Longitud).

#### Cuadrilla

| Campo                | Tipo        | Descripción                                |
|----------------------|-------------|--------------------------------------------|
| Id                   | int (PK)    | Identificador                              |
| Nombre               | string(100) | Nombre de la cuadrilla                     |
| Integrantes          | string(500) | Lista de integrantes                       |
| UsuarioApp           | string(50)  | Usuario de acceso a la app (único)         |
| PasswordHash         | string(255) | Contraseña con BCrypt                      |
| EstatusDisponibilidad| enum        | Disponible, Ocupada, FueraServicio         |

#### Evidencia

| Campo        | Tipo        | Descripción                              |
|--------------|-------------|------------------------------------------|
| Id           | int (PK)    | Identificador                            |
| IdReporte    | int (FK)    | Reporte asociado (Cascade on delete)     |
| Tipo         | enum        | Inicial (1), Resolucion (2)              |
| Archivo      | string(500) | URL/ruta del archivo                     |
| FechaCaptura | DateTime    | Fecha de captura                         |

#### SeguimientoUbicacion

| Campo      | Tipo             | Descripción                          |
|------------|------------------|--------------------------------------|
| Id         | int (PK)         | Identificador                        |
| IdReporte  | int (FK)         | Reporte (Cascade)                    |
| IdCuadrilla| int (FK)         | Cuadrilla que reporta (Cascade)      |
| Latitud / Longitud | decimal(18,15) | Posición GPS              |
| FechaHora  | DateTime         | Marca temporal (indexada)            |

#### UsuarioSistema

| Campo       | Tipo        | Descripción                          |
|-------------|-------------|--------------------------------------|
| Id          | int (PK)    | Identificador                        |
| Nombre      | string(100) | Nombre completo                      |
| Usuario     | string(50)  | Nombre de usuario (único)            |
| PasswordHash| string(255) | BCrypt                               |
| Rol         | enum        | Administrador (1), Cuadrilla (2)     |
| Activo      | bool        | Baja lógica                          |

**Dato semilla:** usuario `admin` / `Admin123!` (rol Administrador). *Cambiar en producción.*

### 6.3 Migraciones

1. `20260924223638_InitialCreate` — tablas base: Cuadrillas, UsuariosSistema, Reportes, Evidencias, SeguimientosUbicacion.
2. `20261001165548_AddPrioridadReporte` — columnas de prioridad, score y justificación en Reportes.

Las migraciones se aplican automáticamente al arrancar la aplicación (solo si el proveedor es relacional).

---

## 7. Referencia de la API REST

**Base URL (desarrollo):** `http://localhost:5170/api`
**Documentación interactiva:** Swagger UI disponible en `/swagger` (solo en entorno de desarrollo).

### 7.1 Reportes — `/api/reportes`

| Método | Ruta                              | Descripción                                        |
|--------|-----------------------------------|----------------------------------------------------|
| GET    | `/api/reportes`                   | Listado paginado con filtros (pagina, registrosPorPagina, estatus, tipoProblema, categoria, prioridad, ordenarPorPrioridad, idCuadrillaAsignada, fechaDesde, fechaHasta, numeroContrato). El total se devuelve en header personalizado. |
| GET    | `/api/reportes/landing`           | Últimos 6 reportes en proceso y últimos 6 nuevos   |
| GET    | `/api/reportes/{id}`              | Detalle completo (evidencias + ubicaciones)        |
| POST   | `/api/reportes`                   | Crear reporte. **Dispara clasificación IA automática**; si la IA falla, aplica fallback heurístico |
| PUT    | `/api/reportes/{id}`              | Actualizar datos del reporte                       |
| PUT    | `/api/reportes/{id}/categoria`    | Corrección manual de categoría/tipo/razonamiento   |
| PUT    | `/api/reportes/{id}/prioridad`    | Ajuste manual de prioridad con justificación       |
| POST   | `/api/reportes/{id}/revaluar-prioridad` | Re-clasificar con IA                         |
| PUT    | `/api/reportes/{id}/asignar`      | Asignar cuadrilla (marca cuadrilla como Ocupada)   |
| PUT    | `/api/reportes/{id}/supervision`  | Programar supervisión (valida RF-13)               |
| PUT    | `/api/reportes/{id}/estatus`      | Cambiar estatus (gestiona disponibilidad de la cuadrilla automáticamente) |
| POST   | `/api/reportes/{id}/evidencias`   | Subir evidencia (multipart/form-data)              |
| GET    | `/api/reportes/{id}/evidencias`   | Listar evidencias de un reporte                    |
| DELETE | `/api/reportes/{id}`              | Eliminar reporte y sus archivos de evidencia       |

**Ejemplo — Crear reporte:**

```http
POST /api/reportes
Content-Type: application/json

{
  "tipoProblema": 1,
  "descripcion": "Fuga fuerte de agua en calle principal, brote a presión",
  "latitud": 21.123456,
  "longitud": -101.654321,
  "numeroContrato": "CTO-12345",
  "nombreCiudadano": "Juan Pérez",
  "telefonoCiudadano": "4771234567"
}
```

Respuesta `201 Created` con el `ReporteDTO` incluyendo la categoría y prioridad asignadas por IA.

### 7.2 Cuadrillas — `/api/cuadrillas`

Hereda CRUD genérico de `CustomBaseController<Cuadrilla, CuadrillaCreacionDTO, CuadrillaDTO>`:

| Método | Ruta                              | Descripción                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/api/cuadrillas`                 | Listado (paginado)                   |
| GET    | `/api/cuadrillas/{id}`            | Detalle                              |
| POST   | `/api/cuadrillas`                 | Crear cuadrilla                      |
| PUT    | `/api/cuadrillas/{id}`            | Actualizar                           |
| DELETE | `/api/cuadrillas/{id}`            | Eliminar                             |
| GET    | `/api/cuadrillas/disponibles`     | Solo cuadrillas con estatus Disponible |
| PUT    | `/api/cuadrillas/{id}/disponibilidad` | Cambiar disponibilidad           |

### 7.3 Evidencias — `/api/evidencias`

| Método | Ruta                     | Descripción                                |
|--------|--------------------------|--------------------------------------------|
| GET    | `/api/evidencias/{id}`   | Obtener evidencia (incluye `archivoUrl`)   |
| DELETE | `/api/evidencias/{id}`   | Eliminar evidencia y su archivo físico     |

### 7.4 Ubicaciones — `/api/reportes/{idReporte}/ubicaciones`

| Método | Ruta                                     | Descripción                                       |
|--------|------------------------------------------|---------------------------------------------------|
| POST   | `/api/reportes/{id}/ubicaciones`         | Registrar lote de posiciones GPS. Solo permitido si el reporte está `LevantandoInformacion` o `EnProceso` y tiene cuadrilla asignada |
| GET    | `/api/reportes/{id}/ubicaciones`         | Historial paginado (default 50/página)            |
| GET    | `/api/reportes/{id}/ubicaciones/ultima`  | Última posición conocida                          |

### 7.5 Usuarios — `/api/usuarios`

| Método | Ruta                        | Descripción                                     |
|--------|-----------------------------|-------------------------------------------------|
| POST   | `/api/usuarios/login`       | Autenticación (BCrypt). Devuelve token + usuario |
| POST   | `/api/usuarios/registrar`   | Registro de nuevo usuario administrador         |
| GET    | `/api/usuarios/{id}`        | Obtener usuario                                 |

> **Nota:** el token devuelto actualmente es un *mock* (`mock-jwt-token-{id}-{guid}`). La infraestructura JWT (`JwtBearer`) está instalada y lista para activarse en producción.

### 7.6 Clasificación — `/api/clasificacion`

| Método | Ruta                 | Descripción                                          |
|--------|----------------------|------------------------------------------------------|
| POST   | `/api/clasificacion` | Clasifica una descripción libre sin persistir nada. Si la IA falla, devuelve clasificación segura por defecto (categoría "Otro", prioridad Media) |

**Respuesta:** `categoria`, `tipoProblema`, `confianza`, `razonamiento`, `prioridad`, `prioridadNombre`, `scorePrioridad`, `justificacionPrioridad`, `requiereAtencionInmediata`.

---

## 8. Servicio de Clasificación con IA (NVIDIA)

### 8.1 Descripción

`ClasificadorNvidiaService` implementa `IClasificadorService` y actúa como **Agente Inteligente de Triage, Clasificación y Priorización**.

- **Proveedor:** NVIDIA NIM — endpoint `https://integrate.api.nvidia.com/v1/chat/completions`
- **Modelo:** `meta/llama-3.2-11b-vision-instruct`
- **Parámetros:** `temperature: 0.1`, `max_tokens: 250`, `top_p: 0.9` (respuestas deterministas)
- **Timeout:** 10 segundos con fallback automático
- **Formato de salida:** JSON estricto forzado vía system prompt

### 8.2 Categorías reconocidas (12)

Agua contaminada o sucia · Baja presión del agua · Falta de abastecimiento · Fuga domiciliaria · Fuga en vía pública · Hundimiento o socavón por fuga · Instalación rota · Medidor dañado · Otro · Registro dañado o sin tapa · Suministro intermitente · Uso indebido

### 8.3 Matriz de priorización

| Prioridad | Score     | Criterios operativos |
|-----------|-----------|----------------------|
| **Crítica** | 0.85–1.00 | Riesgo vital, socavón/hundimiento, fuga torrencial en vía principal, desabasto a hospitales/escuelas, inundación de viviendas, agua contaminada |
| **Alta**    | 0.65–0.84 | Fuga de gran caudal en calle secundaria, desabasto total de colonia (>24 h), registro sin tapa en banqueta concurrida |
| **Media**   | 0.35–0.64 | Fuga domiciliaria externa moderada, baja presión generalizada, hidrante goteando, instalación rota sin riesgo de colapso |
| **Baja**    | 0.00–0.34 | Goteo leve de medidor, medidor empañado, aclaración administrativa, uso indebido menor |

### 8.4 Fallback heurístico

Si la API de NVIDIA no responde, un **clasificador heurístico por palabras clave** (en español) analiza la descripción para inferir categoría y prioridad:

- Palabras clave de categoría: `fuga`, `goteo`, `presión`, `sin agua`, `socavón`, `medidor`, `registro`, `sucia`, `roto`, `toma clandestina`, etc.
- Escalamiento de prioridad: mención de hospitales, escuelas, inundaciones, peligro o colapso ⇒ **Crítica**; desabasto de colonia o avenida ⇒ **Alta**; goteo leve o dudas ⇒ **Baja**.

Esto garantiza que **ningún reporte queda sin clasificar**, aún sin conectividad con el servicio de IA.

### 8.5 Configuración de la clave API

La clave se toma de `IConfiguration["NvidiaApiKey"]`. Definirla en `appsettings.json`, variables de entorno o *user secrets* — **nunca** versionarla.

---

## 9. Configuración y Despliegue

### 9.1 Requisitos previos

| Software      | Versión mínima |
|---------------|----------------|
| .NET SDK      | 8.0            |
| Node.js       | 18+            |
| SQL Server    | 2019+ (producción) |
| SQLite        | (incluido, para desarrollo) |

El repositorio incluye `mise.toml` para gestión de versiones de herramientas.

### 9.2 Ejecución local

**Backend:**

```bash
cd Sistema/API
dotnet restore
dotnet run
# La API queda escuchando (típicamente http://localhost:5170)
# Swagger: http://localhost:5170/swagger
```

**Frontend (PanelAdmin):**

```bash
cd Sistema/PanelAdmin
npm install
npm run dev
# vite dev server
```

**Scripts auxiliares** en la raíz y en `Sistema/`:

- `run-lan.sh` — expone los servicios en la red local.
- `run-tunnel.sh` — expone mediante túnel (acceso externo).

### 9.3 Configuración de conexión

`appsettings.json` (producción por defecto):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=ARJE_AguaPotable;User Id=UsuBD;Password=***;TrustServerCertificate=True;"
  }
}
```

Si la cadena termina en `.db` y el entorno es `Development`, se usa SQLite automáticamente (archivo `arje_aguapotable.db` incluido en el repo para pruebas).

### 9.4 Pruebas de la API

Existe `Sistema/API/test_api.py` (script Python de pruebas de endpoints).

---

## 10. Seguridad y Autenticación

| Aspecto              | Implementación actual                                    | Recomendación producción                     |
|----------------------|----------------------------------------------------------|----------------------------------------------|
| Contraseñas          | Hash BCrypt (`BCrypt.Net-Next`)                          | Mantener                                     |
| Tokens               | Mock (`mock-jwt-token-*`)                                | Activar JWT real con `JwtBearer` (ya instalado) |
| CORS                 | Política `permitirTodo` (todos los orígenes)             | Restringir a dominios del panel y apps       |
| HTTPS                | `UseHttpsRedirection()` habilitado                       | Mantener, forzar HSTS                        |
| SQL Injection        | Mitigado por EF Core (consultas parametrizadas)          | —                                            |
| Clave NVIDIA         | Hardcodeada con fallback en código                       | Mover a user-secrets / variables de entorno  |
| Credenciales BD      | En `appsettings.json`                                    | Mover a secretos y rotarlas                  |
| Usuario semilla      | `admin` / `Admin123!`                                    | Cambiar contraseña en el primer despliegue   |

**Pendientes de seguridad identificados (deuda técnica):**

1. `[Authorize]` no está aplicado a los controladores: los endpoints son públicos actualmente.
2. El login de cuadrillas (`UsuarioApp`/`PasswordHash`) aún no expone endpoint de autenticación dedicado.
3. Auditoría de cambios (quién asignó/cerró) no persistida.

---

## 11. Reglas de Negocio

### 11.1 Ciclo de vida del reporte

```
Nuevo (1) ──► Asignado (2) ──► LevantandoInformacion (3) ──► EnProceso (4)
                                                                  │
                  ◄────────────── Cerrado (7) ◄── EnSupervision (6) ◄── Completado (5)
```

| #   | Estatus               | Significado                                   |
|-----|-----------------------|-----------------------------------------------|
| 1   | Nuevo                 | Recién capturado, pendiente de asignación     |
| 2   | Asignado              | Cuadrilla asignada                            |
| 3   | LevantandoInformacion | Cuadrilla en sitio recabando datos            |
| 4   | EnProceso             | Trabajo de reparación en curso                |
| 5   | Completado            | Trabajo terminado por la cuadrilla            |
| 6   | EnSupervision         | Pendiente de visita de supervisión (RF-13)    |
| 7   | Cerrado               | Validado y cerrado administrativamente        |

### 11.2 Reglas operativas implementadas en código

- **RF-13 (Supervisión cruzada):** la cuadrilla supervisora debe ser **distinta** de la que atendió el reporte. El endpoint `PUT /{id}/supervision` rechaza con `400 Bad Request` si se intenta asignar la misma cuadrilla.
- **Disponibilidad automática de cuadrillas:**
  - Al asignar ⇒ cuadrilla pasa a `Ocupada`.
  - Al salir de estatus `Asignado`, si la cuadrilla no tiene otros reportes asignados ⇒ vuelve a `Disponible`.
- **Seguimiento GPS restringido:** solo se aceptan posiciones cuando el reporte está `LevantandoInformacion` o `EnProceso` y tiene cuadrilla asignada.
- **Clasificación garantizada:** todo reporte nuevo obtiene categoría y prioridad (IA o fallback).
- **Corrección manual con confianza total:** cuando un administrador corrige la categoría, el panel marca `confianzaIA = 1.0`.
- **Tipos de evidencia:** `Inicial` (al reportar) y `Resolucion` (al completar el trabajo).
- **Borrado en cascada seguro:** eliminar un reporte elimina evidencias y seguimientos, y además borra los archivos físicos asociados.

### 11.3 Prioridades por defecto de seguridad

Si todo falla (IA caída + descripción ambigua), el sistema asigna: categoría = tipo de problema genérico, prioridad **Media**, score 0.50, justificación *"Prioridad asignada automáticamente por seguridad"*.

---

## 12. Diagramas de Referencia

El repositorio incluye material de diseño:

| Archivo                              | Contenido                                |
|--------------------------------------|------------------------------------------|
| `DiagramaAppMovilCiudadano.png`      | Diagrama de la app del ciudadano         |
| `DiagramaAppMovilCuadrilla}.png`     | Diagrama de la app de cuadrillas         |
| `DiagramaPanelAdmin.png`             | Diagrama del panel administrativo        |
| `Sistema Arje_ Reportes.fig`         | Diseño Figma del sistema                 |
| `Analisis incial.pdf`                | Análisis inicial del proyecto            |
| `Analisis_Sistema_Reportes_Agua_Potable.docx` | Documento de análisis funcional  |
| `Formato_Avance_Semanal_Residentes_Evolsoft*.docx` | Formato de seguimiento semanal |

---

## Anexo A — Comandos rápidos

```bash
# Migraciones EF Core
cd Sistema/API
dotnet ef migrations add <NombreMigracion>
dotnet ef database update

# Build y publicación de la API
dotnet publish -c Release -o ./publish

# Build del Panel Admin
cd Sistema/PanelAdmin
npm run build       # salida en dist/
npm run preview     # previsualizar build

# Lint del frontend
npm run lint
```

---

## Anexo B — Glosario

| Término      | Definición                                                     |
|--------------|----------------------------------------------------------------|
| **ARJE**     | Organismo operador del servicio de agua potable                |
| **Cuadrilla**| Equipo de campo que atiende físicamente los reportes           |
| **Triage**   | Proceso de clasificación y priorización inicial de incidencias |
| **RF-13**    | Requerimiento funcional de supervisión cruzada                 |
| **Evidencia**| Archivo multimedia que documenta el reporte o su resolución    |
| **Fallback** | Mecanismo de respaldo ante fallo del servicio principal        |

---

*Documento generado a partir del análisis del código fuente del repositorio ARJE-ModuloAtencionCiudadana.*

