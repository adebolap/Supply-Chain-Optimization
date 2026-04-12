#!/bin/bash
# STANDARD_FORMAT_PLAYBOOK.sh
# Apply all standard Terumo formatting to any new PBIR report in one pass.
# Usage: cd to the report's parent folder, then:
#   REPORT="MyReport.Report" bash STANDARD_FORMAT_PLAYBOOK.sh
#
# Confirmed working: April 2026 (Market Share Dashboard)
# pbir version: 0.9.7

PBIR="C:/Users/adebo/AppData/Roaming/Python/Python312/Scripts/pbir.exe"
RPT="${REPORT:-MarketShare.Report}"

echo "Applying standard formatting to: $RPT"
echo ""

# ── 1. Page wallpaper (background) ──────────────────────────────────────────
echo "[1/6] Page wallpaper #F7F7F5..."
for PAGE in "$@"; do
  $PBIR -q pages wallpaper "$RPT/$PAGE.Page" --color "#F7F7F5" 2>&1
done

# If no pages passed as args, apply to all pages discovered via ls
if [ "$#" -eq 0 ]; then
  PAGES=$($PBIR -q ls "$RPT" 2>&1 | grep "\.Page" | sed 's/\.Page.*//' | tr -d '│ ')
  for PAGE in $PAGES; do
    $PBIR -q pages wallpaper "$RPT/$PAGE.Page" --color "#F7F7F5" 2>&1
  done
fi

# ── 2. Hide visual headers ───────────────────────────────────────────────────
echo "[2/6] Hiding visual headers..."
$PBIR -q set "$RPT/**/*.Visual.visualHeader.show" --value false -f 2>&1 \
  | grep -v "^Warning:"
echo "  Done (1 stackedBarChart may warn -- expected)"

# ── 3. No borders ───────────────────────────────────────────────────────────
echo "[3/6] Removing borders..."
$PBIR -q set "$RPT/**/*.Visual.border.show" --value false -f 2>&1 \
  | grep -v "^Warning:"

# ── 4. White visual backgrounds ─────────────────────────────────────────────
echo "[4/6] White visual backgrounds..."
# Note: visuals background does not accept -f; use per-page glob
PAGES_LIST=$($PBIR -q ls "$RPT" 2>&1 | grep "\.Page" | sed 's/ (.*)//' | sed 's/│ //')
while IFS= read -r page_line; do
  page=$(echo "$page_line" | sed 's/\.Page.*//' | sed 's/^[^a-zA-Z]*//')
  if [ -n "$page" ]; then
    $PBIR -q visuals background "$RPT/$page.Page/**/*.Visual" \
      --color "#FFFFFF" --transparency 0 2>&1 | grep -v "^Warning:"
  fi
done <<< "$PAGES_LIST"

# ── 5. Visual titles: Segoe UI Semibold, 11pt, #475569 ───────────────────────
echo "[5/6] Applying title formatting..."
$PBIR -q visuals title "$RPT/**/*.Visual" \
  --show --fontSize 11 --fontColor "#475569" --bold 2>&1 \
  | grep -v "^Warning:"
echo "  Note: textbox visuals keep their own title config"

# ── 6. Final validation ──────────────────────────────────────────────────────
echo "[6/6] Validating..."
$PBIR -q validate "$RPT" 2>&1 | grep -E "passed|failed|errors|warnings|Valid|Invalid"

echo ""
echo "Standard formatting complete."
echo "RENDER_REQUIRED_ROLE_MISSING warnings are expected with stub models -- not blocking."
