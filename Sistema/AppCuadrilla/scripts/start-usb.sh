#!/usr/bin/env bash
# Inicia Expo para un teléfono Android conectado por USB y reenvía la API local.
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v adb >/dev/null 2>&1; then
  echo "No se encontró adb. Instala Android Platform Tools y habilita la depuración USB." >&2
  exit 1
fi

if [[ "$(adb get-state 2>/dev/null || true)" != "device" ]]; then
  echo "No hay un teléfono Android autorizado. Conéctalo por USB y acepta la depuración USB." >&2
  exit 1
fi

# El teléfono accede a localhost; ADB lo reenvía al servidor de la computadora.
adb reverse tcp:5170 tcp:5170
adb reverse tcp:8081 tcp:8081

export EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:5170/api"

echo "Iniciando Expo por USB. API para el teléfono: ${EXPO_PUBLIC_API_BASE_URL}"
echo "La API debe estar ejecutándose en esta computadora en el puerto 5170."

cd "$project_dir"
exec npx expo start --localhost --port 8081 --clear
