#!/bin/bash
# Script para iniciar Expo en modo red local (LAN) para Expo Go y Web

LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' || hostname -I | awk '{print $1}')
echo "=================================================="
echo "Iniciando ARJE AppCiudadano en red local"
echo "IP detectada: $LOCAL_IP"
echo "API Backend esperada en: http://$LOCAL_IP:5170/api"
echo "=================================================="

if [ -d "$(dirname "$0")/AppCiudadano" ]; then
    cd "$(dirname "$0")/AppCiudadano" || exit 1
elif [ -d "$(dirname "$0")/Sistema/AppCiudadano" ]; then
    cd "$(dirname "$0")/Sistema/AppCiudadano" || exit 1
else
    echo "No se encontró el directorio AppCiudadano"
    exit 1
fi

echo "Abriendo Expo en modo Expo Go (LAN)..."
echo "Para abrir en el navegador, presiona la tecla 'w'"
echo "Para abrir en Expo Go, escanea el código QR desde tu celular (en la misma red Wi-Fi)"
echo "=================================================="

npx expo start --go
