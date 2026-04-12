#!/bin/bash
# CF_RECIPE_TEMPLATE.sh
# Add extension measures and apply conditional formatting to a PBIR report.
# Paste this into a project-specific cf_apply.sh and edit the BINDINGS section.
#
# Usage: cd to report parent folder, then:
#   bash CF_RECIPE_TEMPLATE.sh
#
# Confirmed syntax: pbir 0.9.7, April 2026

PBIR="C:/Users/adebo/AppData/Roaming/Python/Python312/Scripts/pbir.exe"
RPT="MyReport.Report"          # <-- change this
TABLE="fact_market_potential"  # <-- change to your measure table

# ── CONFIRMED CF CONTAINER.PROPERTY NAMES ───────────────────────────────────
# clusteredBarChart / stackedBarChart  → dataPoint.fill
# cardVisual background               → background.color
# cardVisual text                     → label.fontColor
# tableEx cell background             → dataPoint.fill
# (no schema describe needed — these are confirmed working)

# ── TRAFFIC LIGHT COLOR SCALE (standard Terumo palette) ─────────────────────
# >= 150 / >= 50%  → #1D9E75  (green  — champion)
# >= 100 / >= 30%  → #5DCAA5  (teal   — above average)
# >= 50  / >= 15%  → #EF9F27  (amber  — below average)
# < 50   / < 15%   → #E24B4A  (red    — growth target)

# ── BADGE COLOR TABLE (text-match) ──────────────────────────────────────────
# Champion / Protect       → BG #EAF3DE  Text #27500A
# Above average / Maintain → BG #E1F5EE  Text #085041
# Below average / Monitor  → BG #FAEEDA  Text #633806
# Growth target / Grow     → BG #FCEBEB  Text #791F1F

echo "=== Step 1: Adding CF extension measures ==="

# Bar color — numeric range (edit thresholds and measure name)
$PBIR -q dax measures add "$RPT" \
  -t "$TABLE" -n "_CF Bar Color" -d Text \
  -e 'SWITCH(TRUE(), [YourMeasure] >= 150, "#1D9E75", [YourMeasure] >= 100, "#5DCAA5", [YourMeasure] >= 50, "#EF9F27", "#E24B4A")' \
  --no-validate 2>&1

# Badge background — text-match (edit badge values as needed)
$PBIR -q dax measures add "$RPT" \
  -t "$TABLE" -n "_CF Badge BG" -d Text \
  -e 'SWITCH([YourBadgeMeasure], "Champion", "#EAF3DE", "Above average", "#E1F5EE", "Below average", "#FAEEDA", "Growth target", "#FCEBEB", BLANK())' \
  --no-validate 2>&1

# Badge text color
$PBIR -q dax measures add "$RPT" \
  -t "$TABLE" -n "_CF Badge Text" -d Text \
  -e 'SWITCH([YourBadgeMeasure], "Champion", "#27500A", "Above average", "#085041", "Below average", "#633806", "Growth target", "#791F1F", BLANK())' \
  --no-validate 2>&1

echo "=== Step 2: Applying CF to visuals ==="

# Bar chart bar color
$PBIR -q visuals cf "$RPT/Page.Page/VisualHexId.Visual" \
  --measure "dataPoint.fill ${TABLE}._CF Bar Color" 2>&1

# Card badge background
$PBIR -q visuals cf "$RPT/Page.Page/BadgeHexId.Visual" \
  --measure "background.color ${TABLE}._CF Badge BG" 2>&1

# Card badge text
$PBIR -q visuals cf "$RPT/Page.Page/BadgeHexId.Visual" \
  --measure "label.fontColor ${TABLE}._CF Badge Text" 2>&1

# Table cell background (same syntax as bar chart)
$PBIR -q visuals cf "$RPT/Page.Page/TableHexId.Visual" \
  --measure "dataPoint.fill ${TABLE}._CF Bar Color" 2>&1

echo "=== Done. Run validate to confirm ==="
$PBIR -q validate "$RPT" 2>&1 | grep -E "passed|failed|errors|warnings|Valid|Invalid"
