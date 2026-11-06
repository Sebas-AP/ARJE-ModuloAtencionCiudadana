#!/bin/bash
# Ejecuta Expo en modo túnel (Metro vía Expo, API vía ngrok) para AppCiudadano
# o AppCuadrilla. El túnel de Expo SOLO expone el bundler: la API necesita su
# propio túnel (ngrok) para ser alcanzable fuera de la red local.
# Uso: ./run-tunnel.sh [ciudadano|cuadrilla]   (por defecto: ciudadano)

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

# Verificar que ngrok está instalado
if ! command -v ngrok &> /dev/null; then
  echo "ngrok no encontrado. Instalando..."
  wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -O /tmp/ngrok.tgz
  tar -xzf /tmp/ngrok.tgz -C /tmp
  mkdir -p ~/.local/bin
  mv /tmp/ngrok ~/.local/bin/
  chmod +x ~/.local/bin/ngrok
  export PATH="$HOME/.local/bin:$PATH"
fi

# Iniciar ngrok para la API en background
echo "Iniciando ngrok para API en puerto 5170..."
ngrok http 5170 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
trap 'kill $NGROK_PID 2>/dev/null' EXIT

# Esperar a que ngrok inicie
sleep 3

# Obtener la URL pública de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
  echo "=================================================="
  echo "Error: No se pudo obtener la URL de ngrok."
  if grep -q "ERR_NGROK_4018" /tmp/ngrok.log 2>/dev/null; then
    echo "Causa: Tu sesión de ngrok requiere autenticación gratuita."
    echo "Para registrar tu token ejecuta: ngrok config add-authtoken <TU_TOKEN>"
  else
    cat /tmp/ngrok.log | head -n 10
  fi
  echo "--------------------------------------------------"
  echo "CONSEJO: Si tu teléfono está conectado a la misma red Wi-Fi,"
  echo "no necesitas ngrok. Ejecuta simplemente: ./run-lan.sh $APP"
  echo "=================================================="
  exit 1
fi

echo "API Tunnel: $NGROK_URL"
echo "Esta API debe estar corriendo (dotnet run) ANTES de abrir la app,"
echo "o las subidas/consultas fallarán aunque el túnel esté activo."
echo "Iniciando Expo con túnel para $APP..."

# Exportar la URL para que la app la use (ambas apps la leen)
export EXPO_PUBLIC_API_TUNNEL_URL="$NGROK_URL"

cd "$APP_DIR"
npx expo start --tunnel
