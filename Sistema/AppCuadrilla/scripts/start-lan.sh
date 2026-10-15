#!/usr/bin/env bash
# Inicia Expo en LAN con una URL de API válida para teléfonos físicos.
# Se puede fijar la IP manualmente: EXPO_LOCAL_IP=192.168.1.50 ./scripts/start-lan.sh

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

is_private_ipv4() {
  local candidate="$1"

  [[ "$candidate" =~ ^10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]] && return 0
  [[ "$candidate" =~ ^192\.168\.[0-9]{1,3}\.[0-9]{1,3}$ ]] && return 0

  if [[ "$candidate" =~ ^172\.([0-9]{1,3})\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    (( BASH_REMATCH[1] >= 16 && BASH_REMATCH[1] <= 31 ))
    return
  fi

  return 1
}

detect_local_ip() {
  local candidate

  if [[ -n "${EXPO_LOCAL_IP:-}" ]]; then
    if is_private_ipv4 "$EXPO_LOCAL_IP"; then
      printf '%s\n' "$EXPO_LOCAL_IP"
      return 0
    fi

    echo "EXPO_LOCAL_IP debe ser una IPv4 privada (por ejemplo, 192.168.1.50)." >&2
    return 1
  fi

  if command -v ip >/dev/null 2>&1; then
    candidate="$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ { for (field = 1; field <= NF; field++) if ($field == "src") { print $(field + 1); exit } }')"
    if is_private_ipv4 "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi

    while IFS= read -r candidate; do
      if is_private_ipv4 "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done < <(ip -4 -o addr show up scope global 2>/dev/null | awk '{ split($4, address, "/"); print address[1] }')
  fi

  if command -v hostname >/dev/null 2>&1; then
    for candidate in $(hostname -I 2>/dev/null || true); do
      if is_private_ipv4 "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done
  fi

  return 1
}

local_ip="$(detect_local_ip)" || {
  cat >&2 <<'EOF'
No se pudo detectar una IPv4 privada de esta computadora.
Conecta la computadora y el teléfono a la misma Wi-Fi, o indica la IP manualmente:
  EXPO_LOCAL_IP=192.168.1.50 ./scripts/start-lan.sh
EOF
  exit 1
}

export EXPO_PUBLIC_API_BASE_URL="http://${local_ip}:5170/api"

cat <<EOF
Iniciando Expo en modo LAN (sin túnel).
API para esta sesión: ${EXPO_PUBLIC_API_BASE_URL}

Antes de escanear el QR, la API debe estar iniciada en 0.0.0.0:5170
y el teléfono debe estar en la misma red Wi-Fi que esta computadora.
EOF

cd "$project_dir"
exec npx expo start --lan --clear "$@"
