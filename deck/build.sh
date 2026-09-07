#!/usr/bin/env bash
# Renders deck/index.html to deck/attestcredit-deck.pdf with headless Chrome (10 slides, 1280×720).
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-}"
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" "/Applications/Chromium.app/Contents/MacOS/Chromium" "$(command -v google-chrome || true)" "$(command -v chromium || true)"; do
  [ -n "$CHROME" ] && break
  [ -x "$c" ] && CHROME="$c"
done
[ -n "$CHROME" ] || { echo "no Chromium based browser found; set CHROME=/path/to/binary" >&2; exit 1; }
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD/attestcredit-deck.pdf" "file://$PWD/index.html"
echo "wrote deck/attestcredit-deck.pdf"
