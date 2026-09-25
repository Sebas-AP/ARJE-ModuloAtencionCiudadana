# ARJE - Módulo Atención Ciudadana

Sistema integral para la gestión de atención al ciudadano, compuesto por tres aplicaciones principales:

## Estructura del Proyecto

```
Sistema/
├── API/              # Backend API (ASP.NET Core)
├── AppCiudadano/     # Aplicación móvil para ciudadanos (React Native/Expo)
├── AppCuadrilla/     # Aplicación para cuadrillas de trabajo
└── PanelAdmin/       # Panel de administración web
```

## Componentes

### API
Backend desarrollado en ASP.NET Core que provee los endpoints REST para:
- Gestión de reportes ciudadanos
- Administración de cuadrillas
- Seguimiento de ubicaciones
- Gestión de evidencias
- Autenticación y autorización

### AppCiudadano
Aplicación móvil desarrollada con React Native y Expo para que los ciudadanos puedan:
- Crear y dar seguimiento a reportes
- Adjuntar evidencias (fotos, videos)
- Recibir notificaciones de estado

### AppCuadrilla
Aplicación para el personal de campo (cuadrillas) para:
- Recibir asignaciones de trabajo
- Actualizar estado de reportes
- Reportar avances y evidencias

### PanelAdmin
Panel de administración web para:
- Gestión de usuarios y roles
- Monitoreo de reportes en tiempo real
- Generación de reportes y estadísticas
- Configuración del sistema

## Requisitos Previos

- .NET 8 SDK (para la API)
- Node.js 18+ (para AppCiudadano)
- Base de datos SQL Server / PostgreSQL

## Configuración

Cada componente tiene su propia configuración. Revisar los archivos README en cada carpeta para instrucciones específicas.

## Licencia

Proyecto privado - ARJE
