#!/usr/bin/env bash
# Crea el ícono «Folletos Rivero Market» en el Escritorio y en el menú de aplicaciones (Linux).
AQUI="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
ESC="$(xdg-user-dir DESKTOP 2>/dev/null)"; [ -d "$ESC" ] || ESC="$HOME/Desktop"
mkdir -p "$ESC" "$HOME/.local/share/applications"
cat > "$AQUI/programa/folletos-rivero-market.desktop" <<DESK
[Desktop Entry]
Type=Application
Version=1.0
Name=Folletos Rivero Market
Comment=Arma los folletos de ofertas de Rivero Market
Exec=python3 "$AQUI/programa/servidor.py" --abrir
Icon=$AQUI/programa/icono.png
Terminal=false
Categories=Graphics;
StartupNotify=false
DESK
cp "$AQUI/programa/folletos-rivero-market.desktop" "$ESC/Folletos Rivero Market.desktop"
cp "$AQUI/programa/folletos-rivero-market.desktop" "$HOME/.local/share/applications/folletos-rivero-market.desktop"
chmod +x "$ESC/Folletos Rivero Market.desktop"
command -v gio >/dev/null 2>&1 && gio set "$ESC/Folletos Rivero Market.desktop" metadata::trusted true 2>/dev/null
echo "Listo: ya tenes el icono «Folletos Rivero Market» en el Escritorio."
