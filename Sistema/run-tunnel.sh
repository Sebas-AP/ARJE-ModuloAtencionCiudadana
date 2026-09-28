#!/bin/bash
# Script para ejecutar Expo con túnel ngrok para la API

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
    echo "no necesitas ngrok. Ejecuta simplemente: ./run-lan.sh"
    echo "=================================================="
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo "API Tunnel: $NGROK_URL"
echo "Iniciando Expo con túnel..."

# Exportar la URL para que Expo la use
export EXPO_PUBLIC_API_TUNNEL_URL="$NGROK_URL"

# Iniciar Expo con túnel
cd /home/sebastian/Proyectos/ARJE-ModuloAtencionCiudadana/Sistema/AppCiudadano
npx expo start --tunnel

# Limpiar al salir
kill $NGROK_PID