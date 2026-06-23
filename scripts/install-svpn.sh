#!/usr/bin/env bash
set -euo pipefail

APP_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TARGET_DIR="$HOME/.local/bin"
TARGET="$TARGET_DIR/svpn"

mkdir -p "$TARGET_DIR"
chmod +x "$APP_ROOT/bin/svpn.js"
ln -sf "$APP_ROOT/bin/svpn.js" "$TARGET"

case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *)
    if [ -f "$HOME/.bashrc" ] && ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc"; then
      cat >> "$HOME/.bashrc" <<'EOF'

# SilverVPN user commands
export PATH="$HOME/.local/bin:$PATH"
EOF
    fi
    ;;
esac

mkdir -p "$HOME/.config/SilverVPN"

cat <<EOF
SilverVPN svpn command installed:
  $TARGET

Next steps:
  1. Open a new shell or run:
       export PATH="$HOME/.local/bin:$PATH"

  2. Import your subscription if needed:
       svpn import 'sub://...'

  3. For multi-user servers, set a personal port base if the default is occupied:
       svpn config ports 4880

  4. Start your personal proxy-only backend:
       svpn start --proxy
       source ~/.config/SilverVPN/shell-proxy.sh

  5. Configure VS Code Remote for this user if needed:
       svpn vscode on
       pkill -f .vscode-server || true

No TUN, no /etc environment edits, no global proxy pollution.
EOF
