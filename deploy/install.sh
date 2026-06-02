#!/usr/bin/env bash
set -euo pipefail

APP_NAME="lantz-screego"
DEFAULT_VERSION="0.0.1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh [options]

Options:
  --domain DOMAIN          Public HTTPS domain, writes SCREEGO_EXTERNAL_IP=dns:DOMAIN
  --external-ip IP         Public server IP, writes SCREEGO_EXTERNAL_IP=IP
  --version VERSION        Image version tag, default 0.0.1
  --image IMAGE            Full image reference, overrides --version
  --http-host HOST         Internal HTTP listen host, default 127.0.0.1
  --http-port PORT         Internal HTTP listen port, default 5050
  --turn-port PORT         TURN/STUN port, default 3478
  --auth-mode MODE         Screego auth mode, default none
  --skip-pull              Do not run docker compose pull
  --help                   Show this help

Examples:
  ./deploy.sh --domain share.example.com
  ./deploy.sh --external-ip 1.2.3.4
  LANTZ_SCREEGO_DOMAIN=share.example.com ./deploy.sh
  LANTZ_SCREEGO_EXTERNAL_IP=1.2.3.4 ./deploy.sh
  LANTZ_SCREEGO_VERSION=0.0.1 ./deploy.sh
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "plugin"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "standalone"
    return
  fi
  echo "Docker Compose is not available. Install the Docker Compose plugin in 1Panel first." >&2
  exit 1
}

compose() {
  if [ "${COMPOSE_KIND}" = "plugin" ]; then
    docker compose "$@"
    return
  fi
  docker-compose "$@"
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi
  local secret=""
  secret="$(dd if=/dev/urandom bs=48 count=1 2>/dev/null | base64 | tr -dc 'A-Za-z0-9' | cut -c 1-64 || true)"
  if [ -z "${secret}" ]; then
    echo "Could not generate SCREEGO_SECRET. Install openssl and re-run." >&2
    exit 1
  fi
  echo "${secret}"
}

detect_public_ip() {
  local ip=""
  if command -v curl >/dev/null 2>&1; then
    ip="$(curl -fsSL --max-time 5 https://api.ipify.org || true)"
  fi
  if [ -z "${ip}" ] && command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  echo "${ip}"
}

get_env_value() {
  local key="$1"
  if [ -f "${ENV_FILE}" ]; then
    awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2)}' "${ENV_FILE}" | tail -n 1
  fi
}

write_env() {
  local key="$1"
  local value="$2"
  printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
}

DOMAIN="${LANTZ_SCREEGO_DOMAIN:-}"
EXTERNAL_IP="${LANTZ_SCREEGO_EXTERNAL_IP:-}"
VERSION="${LANTZ_SCREEGO_VERSION:-${DEFAULT_VERSION}}"
IMAGE="${LANTZ_SCREEGO_IMAGE:-}"
HTTP_PORT="${LANTZ_SCREEGO_HTTP_PORT:-5050}"
HTTP_HOST="${LANTZ_SCREEGO_HTTP_HOST:-127.0.0.1}"
TURN_PORT="${LANTZ_SCREEGO_TURN_PORT:-3478}"
AUTH_MODE="${SCREEGO_AUTH_MODE:-none}"
SKIP_PULL=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --domain" >&2
        exit 1
      fi
      DOMAIN="${2:-}"
      shift 2
      ;;
    --external-ip)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --external-ip" >&2
        exit 1
      fi
      EXTERNAL_IP="${2:-}"
      shift 2
      ;;
    --version)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --version" >&2
        exit 1
      fi
      VERSION="${2:-}"
      shift 2
      ;;
    --image)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --image" >&2
        exit 1
      fi
      IMAGE="${2:-}"
      shift 2
      ;;
    --http-port)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --http-port" >&2
        exit 1
      fi
      HTTP_PORT="${2:-}"
      shift 2
      ;;
    --http-host)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --http-host" >&2
        exit 1
      fi
      HTTP_HOST="${2:-}"
      shift 2
      ;;
    --turn-port)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --turn-port" >&2
        exit 1
      fi
      TURN_PORT="${2:-}"
      shift 2
      ;;
    --auth-mode)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --auth-mode" >&2
        exit 1
      fi
      AUTH_MODE="${2:-}"
      shift 2
      ;;
    --skip-pull)
      SKIP_PULL=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_command docker
COMPOSE_KIND="$(detect_compose)"

if [ ! -f "${ENV_FILE}" ]; then
  if [ -z "${IMAGE}" ]; then
    IMAGE="ghcr.io/lantianz/lantz-screego:${VERSION}"
  fi

  if [ -z "${DOMAIN}" ] && [ -z "${EXTERNAL_IP}" ]; then
    EXTERNAL_IP="$(detect_public_ip)"
  fi

  if [ -n "${DOMAIN}" ]; then
    SCREEGO_PUBLIC_IP="dns:${DOMAIN}"
  elif [ -n "${EXTERNAL_IP}" ]; then
    SCREEGO_PUBLIC_IP="${EXTERNAL_IP}"
  else
    echo "Could not detect public IP. Re-run with --domain DOMAIN or --external-ip IP." >&2
    exit 1
  fi

  umask 077
  write_env "LANTZ_SCREEGO_IMAGE" "${IMAGE}"
  write_env "LANTZ_SCREEGO_VERSION" "${VERSION}"
  write_env "LANTZ_SCREEGO_CONTAINER_NAME" "${APP_NAME}"
  write_env "SCREEGO_SECRET" "$(random_secret)"
  write_env "SCREEGO_EXTERNAL_IP" "${SCREEGO_PUBLIC_IP}"
  write_env "SCREEGO_SERVER_ADDRESS" "${HTTP_HOST}:${HTTP_PORT}"
  write_env "SCREEGO_TURN_ADDRESS" "0.0.0.0:${TURN_PORT}"
  write_env "SCREEGO_TURN_EXTERNAL_PORT" "${TURN_PORT}"
  write_env "SCREEGO_TURN_DENY_PEERS" "0.0.0.0/8,127.0.0.1/8,::/128,::1/128,fe80::/10"
  write_env "SCREEGO_AUTH_MODE" "${AUTH_MODE}"
  write_env "SCREEGO_CLOSE_ROOM_WHEN_OWNER_LEAVES" "true"
  write_env "SCREEGO_TRUST_PROXY_HEADERS" "true"
  write_env "SCREEGO_LOG_LEVEL" "info"
  echo "Created ${ENV_FILE}"
else
  echo "Using existing ${ENV_FILE}"
  echo "Edit this file to change domain, IP, image, ports, or auth mode."
fi

cd "${PROJECT_DIR}"

if [ "${SKIP_PULL}" -eq 0 ]; then
  compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" pull
fi

compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d

HTTP_ADDRESS="$(get_env_value SCREEGO_SERVER_ADDRESS)"
HTTP_PORT_CHECK="${HTTP_ADDRESS##*:}"
CONTAINER_NAME="$(get_env_value LANTZ_SCREEGO_CONTAINER_NAME)"

echo
echo "Lantz Screego is deployed."
echo "Container: ${CONTAINER_NAME:-${APP_NAME}}"
echo "Image: $(get_env_value LANTZ_SCREEGO_IMAGE)"
echo
echo "Health check:"
echo "  curl http://127.0.0.1:${HTTP_PORT_CHECK}/health"
echo
echo "1Panel reverse proxy:"
echo "  Proxy target: http://127.0.0.1:${HTTP_PORT_CHECK}"
echo "  Enable HTTPS for your public domain."
echo
echo "Firewall / security group:"
echo "  Open ${TURN_PORT}/tcp and ${TURN_PORT}/udp for TURN/STUN."
echo "  Open ${HTTP_PORT_CHECK}/tcp only if you are not using a reverse proxy."
