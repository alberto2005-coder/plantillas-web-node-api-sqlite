#!/usr/bin/env bash
# --------------------------------------------------------------------------
# CONFIGURADOR DE LAS PLANTILLAS — macOS / Linux
# Uso (desde la carpeta plantillas-web):
#     bash configurar.sh
#
# Comprueba la versión de Node y crea el .env de cada plantilla a partir de
# su .env.example si todavía no existe. No borra nada.
# --------------------------------------------------------------------------
set -u

raiz="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
verde=$'\033[32m'; rojo=$'\033[31m'; amarillo=$'\033[33m'; cian=$'\033[36m'; gris=$'\033[90m'; sin=$'\033[0m'

echo
echo "${cian}  CONFIGURADOR DE PLANTILLAS${sin}"
echo "  ---------------------------"

# 1) Node -------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "${rojo}  [X] No encuentro Node.js.${sin}"
  echo "       Instálalo desde https://nodejs.org (versión 22.13 o superior)."
  exit 1
fi

version="$(node -v | sed 's/^v//')"
mayor="${version%%.*}"
resto="${version#*.}"
menor="${resto%%.*}"
mayor="${mayor//[^0-9]/}"; menor="${menor//[^0-9]/}"

if [ "${mayor:-0}" -lt 22 ] || { [ "${mayor:-0}" -eq 22 ] && [ "${menor:-0}" -lt 13 ]; }; then
  echo "${rojo}  [X] Node $version es demasiado antiguo: hace falta 22.13 o superior.${sin}"
  exit 1
fi
echo "${verde}  [OK] Node $version${sin}"

# 2) .env de cada plantilla -------------------------------------------------
creados=0
total=0
for carpeta in "$raiz"/*/; do
  [ -f "${carpeta}package.json" ] || continue
  nombre="$(basename "$carpeta")"
  total=$((total + 1))

  if [ -f "${carpeta}.env" ]; then
    echo "${gris}  [OK] $nombre .env ya existe (no se toca)${sin}"
  elif [ -f "${carpeta}.env.example" ]; then
    cp "${carpeta}.env.example" "${carpeta}.env"
    echo "${verde}  [+]  $nombre .env creado desde .env.example${sin}"
    creados=$((creados + 1))
  else
    echo "${amarillo}  [!]  $nombre no tiene .env.example${sin}"
  fi
done

# 3) Resumen ----------------------------------------------------------------
echo
echo "${cian}  SIGUIENTES PASOS${sin}"
echo "  -----------------"
if [ "$total" -gt 0 ]; then
  primera="$(ls "$raiz" | head -1)"
  echo "  1. cd $primera"
  echo "  2. npm start"
  echo "  3. http://localhost:3000"
fi
echo
echo "  Puertos distintos para verlas a la vez:  PORT=3102 npm start"
echo
if [ "$creados" -eq 0 ]; then
  echo "${gris}  (Nada que configurar: todas ya tienen .env)${sin}"
fi
echo
