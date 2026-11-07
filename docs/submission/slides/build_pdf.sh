#!/usr/bin/env bash
# Build the slide deck PDF (vector, embedded TrueType text).
# Chromium embeds the local static TTFs as CID TrueType, so the PDF is
# zoom-crisp, selectable, and searchable on any device.
set -euo pipefail
cd "$(dirname "$0")"
chromium --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=Sandboxed-Agent-Studio-Slides.pdf \
  "file://$(pwd)/slides.html"
echo "wrote Sandboxed-Agent-Studio-Slides.pdf"
