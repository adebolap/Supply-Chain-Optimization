#!/bin/bash
# apply_cf_mpr.sh — Market Potential Report: CF extension measures + apply
# Run from: C:/Users/adebo/reports/market-potential-report/
# Usage: bash apply_cf_mpr.sh

PBIR="C:/Users/adebo/AppData/Roaming/Python/Python312/Scripts/pbir.exe"
RPT="Market Potential Report.Report"
FACT="fact_market_potential"

# ── RI BACKGROUND COLOR ──────────────────────────────────────────────────────
# Applied to: RI cells in all tables + RI bar chart bars
echo "=== Adding CF extension measures ==="

$PBIR -q dax measures add "$RPT" \
  -t "$FACT" -n "_CF RI BG" -d Text \
  -e 'VAR ri = [MS Realization Index]
RETURN
SWITCH(TRUE(),
    ISBLANK(ri),        BLANK(),
    ri < 50,            "#FCEBEB",
    ri < 80,            "#FAEEDA",
    ri < 100,           "#FFF8E1",
    ri < 150,           "#EAF3DE",
    "#C0DD97"
)' --no-validate 2>&1 | grep -v "^Warning\|PYTHON~1"

$PBIR -q dax measures add "$RPT" \
  -t "$FACT" -n "_CF RI Text" -d Text \
  -e 'VAR ri = [MS Realization Index]
RETURN
SWITCH(TRUE(),
    ISBLANK(ri),        BLANK(),
    ri < 50,            "#791F1F",
    ri < 80,            "#633806",
    ri < 100,           "#633806",
    ri < 150,           "#27500A",
    "#173404"
)' --no-validate 2>&1 | grep -v "^Warning\|PYTHON~1"

# ── ACTION BADGE BACKGROUND ──────────────────────────────────────────────────
$PBIR -q dax measures add "$RPT" \
  -t "$FACT" -n "_CF Action BG" -d Text \
  -e 'SWITCH([MS Customer Action Badge],
    "Protect",          "#EAF3DE",
    "Maintain",         "#E1F5EE",
    "Monitor",          "#FAEEDA",
    "Grow",             "#FCEBEB",
    BLANK()
)' --no-validate 2>&1 | grep -v "^Warning\|PYTHON~1"

$PBIR -q dax measures add "$RPT" \
  -t "$FACT" -n "_CF Action Text" -d Text \
  -e 'SWITCH([MS Customer Action Badge],
    "Protect",          "#27500A",
    "Maintain",         "#085041",
    "Monitor",          "#633806",
    "Grow",             "#791F1F",
    BLANK()
)' --no-validate 2>&1 | grep -v "^Warning\|PYTHON~1"

# ── ACTION IN CATEGORY ────────────────────────────────────────────────────────
$PBIR -q dax measures add "$RPT" \
  -t "$FACT" -n "_CF CatAction BG" -d Text \
  -e 'SWITCH([MS Customer Action in Category],
    "Priority Target",      "#FCEBEB",
    "Growth Opportunity",   "#FAEEDA",
    "Capture Remaining",    "#E6F1FB",
    "Protect Position",     "#EAF3DE",
    "Fully Penetrated",     "#EAF3DE",
    BLANK()
)' --no-validate 2>&1 | grep -v "^Warning\|PYTHON~1"

# ── TARGET STATUS ─────────────────────────────────────────────────────────────
$PBIR -q dax measures add "$RPT" \
  -t "$FACT" -n "_CF TargetStatus BG" -d Text \
  -e 'SWITCH([MS Current vs Target Status],
    "Achieved",             "#C0DD97",
    "Near target",          "#EAF3DE",
    "Halfway",              "#FAEEDA",
    "Below target",         "#FCEBEB",
    BLANK()
)' --no-validate 2>&1 | grep -v "^Warning\|PYTHON~1"

# ── RI BAR COLOR (for bar charts showing RI) ─────────────────────────────────
$PBIR -q dax measures add "$RPT" \
  -t "$FACT" -n "_CF RI Bar" -d Text \
  -e 'VAR ri = [MS Realization Index]
RETURN
SWITCH(TRUE(),
    ISBLANK(ri),    BLANK(),
    ri < 50,        "#E24B4A",
    ri < 100,       "#EF9F27",
    ri < 150,       "#5DCAA5",
    "#1D9E75"
)' --no-validate 2>&1 | grep -v "^Warning\|PYTHON~1"

echo ""
echo "=== Applying CF to RI bar charts ==="

# P2 — RI bar chart bar colors
$PBIR -q visuals cf "$RPT/49be14b5b29746e5.Page/p2-bar-ri.Visual" \
  --measure "dataPoint.fill ${FACT}._CF RI Bar" 2>&1 | grep -v "^Warning\|PYTHON~1"

# P5 — RI by category bar chart
$PBIR -q visuals cf "$RPT/3a5d3709ba6bc2df.Page/p5-bar-ri.Visual" \
  --measure "dataPoint.fill ${FACT}._CF RI Bar" 2>&1 | grep -v "^Warning\|PYTHON~1"

echo ""
echo "=== Applying CF to tables ==="

# P2 — Category detail table: RI background
$PBIR -q visuals cf "$RPT/49be14b5b29746e5.Page/p2-tbl.Visual" \
  --measure "dataPoint.fill ${FACT}._CF RI BG" 2>&1 | grep -v "^Warning\|PYTHON~1"

# P3 — Customer detail table: RI background + Action Badge background
$PBIR -q visuals cf "$RPT/55d24ffa308af020.Page/p3-tbl.Visual" \
  --measure "dataPoint.fill ${FACT}._CF RI BG" 2>&1 | grep -v "^Warning\|PYTHON~1"

# P4 — Customer by category table: RI bg + CatAction bg
$PBIR -q visuals cf "$RPT/d228ca413dc2a0f1.Page/p4-tbl.Visual" \
  --measure "dataPoint.fill ${FACT}._CF RI BG" 2>&1 | grep -v "^Warning\|PYTHON~1"

# P5 — mix table: RI bg
$PBIR -q visuals cf "$RPT/3a5d3709ba6bc2df.Page/p5-tbl-mix.Visual" \
  --measure "dataPoint.fill ${FACT}._CF RI BG" 2>&1 | grep -v "^Warning\|PYTHON~1"

echo ""
echo "=== Final validation ==="
$PBIR -q validate "$RPT" 2>&1 | grep -E "passed|failed|errors|warnings|Valid|Invalid"

echo ""
echo "CF application complete."
echo "NOTE: Customer Strength Badge cards and Action Flag text-match CF"
echo "must be applied after connecting to live model in Power BI Desktop."
