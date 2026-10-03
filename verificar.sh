#!/usr/bin/env bash
# --------------------------------------------------------------------------
# VERIFICADOR DE LAS PLANTILLAS — macOS / Linux (equivalente de verificar.ps1)
# --------------------------------------------------------------------------
# Uso (desde la carpeta plantillas-web):
#     bash verificar.sh
#
# Arranca cada plantilla en un puerto distinto (3101…3107), comprueba que
# GET /api/salud responde 200 y que la web responde 200, y las vuelve a parar.
#
# Compatible con bash 3.2 (macOS): sin arrays asociativos ni bash 4+.
# OJO: los puertos 3101-3107 deben estar libres.
# --------------------------------------------------------------------------
set -u

raiz="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
verde=$'\033[32m'; rojo=$'\033[31m'; cian=$'\033[36m'; gris=$'\033[90m'; sin=$'\033[0m'

# Mapeo: carpeta → puerto (los mismos puertos que verificar.ps1)
planes="
01-portfolio 3101
02-saas 3102
03-blog 3103
04-tienda 3104
05-agencia 3105
06-dashboard 3106
07-restaurante 3107
"

pids=""
total=0
ok=0
fallos=0
logs=""

# --- Limpieza: mata SIEMPRE todos los servidores arrancados -----------------
limpiar() {
  vivos=""
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      vivos="$vivos $pid"
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  if [ -n "$vivos" ]; then
    sleep 1
    for pid in $vivos; do
      kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
    done
  fi
  for pid in $pids; do
    wait "$pid" 2>/dev/null || true
  done
  for f in $logs; do
    rm -f "$f"
  done
}
trap 'limpiar' EXIT
trap 'limpiar; exit 130' INT TERM

echo
echo "${cian}  VERIFICACIÓN DE LAS PLANTILLAS${sin}"
echo "  -------------------------------"

if ! command -v curl >/dev/null 2>&1; then
  echo "${rojo}  [X] No encuentro curl.${sin}"
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "${rojo}  [X] No encuentro Node.js.${sin}"
  exit 1
fi

# --- Una plantilla tras otra (el bucle corre en este shell: $ok es visible) --
while read -r carpeta puerto; do
  [ -z "$carpeta" ] && continue
  carpeta_dir="$raiz/$carpeta"
  servidor="$carpeta_dir/server/server.js"

  if [ ! -f "$servidor" ]; then
    echo "${gris}  [--] $(printf '%-14s' "$carpeta") sin server/server.js (se omite)${sin}"
    continue
  fi
  total=$((total + 1))

  # Registro de lo que imprime el servidor, por si hay que diagnosticar
  log="$(mktemp 2>/dev/null || echo "/tmp/verificar-sh-$carpeta.$$")"
  logs="$logs $log"

  # `exec` convierte el subshell en node: $! es el PID real del servidor
  (
    cd "$carpeta_dir" || exit 1
    export PORT="$puerto"
    exec node --disable-warning=ExperimentalWarning server/server.js
  ) >"$log" 2>&1 &
  pid=$!
  pids="$pids $pid"

  # --- /api/salud, con reintentos ------------------------------------------
  salud="no"
  intento=0
  while [ "$intento" -lt 30 ]; do
    intento=$((intento + 1))
    kill -0 "$pid" 2>/dev/null || break
    if curl -fsS --max-time 2 "http://127.0.0.1:$puerto/api/salud" 2>/dev/null | grep -q '"ok"'; then
      salud="si"
      break
    fi
    sleep 0.3
  done

  # --- GET / ---------------------------------------------------------------
  web="no"
  if curl -fsS -o /dev/null --max-time 3 "http://127.0.0.1:$puerto/" 2>/dev/null; then
    web="si"
  fi

  # --- Se para YA (también si ha fallado) ----------------------------------
  if kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null || true
    espera=0
    while kill -0 "$pid" 2>/dev/null && [ "$espera" -lt 15 ]; do
      sleep 0.1
      espera=$((espera + 1))
    done
    kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi

  if [ "$salud" = "si" ] && [ "$web" = "si" ]; then
    echo "${verde}  [OK] $(printf '%-14s' "$carpeta") API + web en :$puerto${sin}"
    ok=$((ok + 1))
  else
    echo "${rojo}  [X]  $(printf '%-14s' "$carpeta") NO responde (puerto $puerto)${sin}"
    echo "      Últimas líneas del servidor:"
    tail -n 5 "$log" 2>/dev/null | sed 's/^/      /'
    fallos=$((fallos + 1))
  fi
done <<EOF
$planes
EOF

# --- Resumen ---------------------------------------------------------------
echo
echo "  Resumen: $ok de $total plantillas verificadas correctamente."
echo

if [ "$fallos" -gt 0 ]; then
  exit 1
fi
exit 0
