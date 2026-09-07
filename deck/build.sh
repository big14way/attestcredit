#!/usr/bin/env bash
# Renders deck/index.html to deck/attestcredit-deck.pdf with headless Chrome (10 slides, 1280×720).
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME=$(command -v google-chrome || command -v chromium || true)
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD/attestcredit-deck.pdf" "file://$PWD/index.html"
echo "wrote deck/attestcredit-deck.pdf"
