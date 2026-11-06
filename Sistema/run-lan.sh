#!/bin/bash
# Inicia AppCiudadano o AppCuadrilla en modo LAN con la IP correcta
# detectada automáticamente para Metro y para la API.
# Uso: ./run-lan.sh [ciudadano|cuadrilla]   (por defecto: ciudadano)

set -euo pipefail

APP="${1:-ciudadano}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$APP" in
  ciudadano)
    APP_DIR="$SCRIPT_DIR/AppCiudadano"
    ;;
  cuadrilla)
    APP_DIR="$SCRIPT_DIR/AppCuadrilla"
    ;;
  *)
    echo "Uso: $0 [ciudadano|cuadrilla]" >&2
    exit 1
    ;;
esac

if [ ! -d "$APP_DIR" ]; then
  echo "No se encontró el directorio $APP_DIR" >&2
  exit 1
fi

exec "$APP_DIR/scripts/start-lan.sh"
