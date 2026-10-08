#!/usr/bin/env bash
# Abre el programa de folletos de Rivero Market (Linux y Mac). Hace falta Python 3.
AQUI="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")" && pwd)"
if ! command -v python3 >/dev/null 2>&1; then echo "No encuentro Python 3. Instalalo (por ejemplo: sudo apt install python3)."; exit 1; fi
exec python3 "$AQUI/programa/servidor.py" --abrir
