"""
build_visuals_ms.py — creates all visual.json files for the
Terumo Market Share Dashboard (4 pages, 1920x1080).
Run once after pbir new report and page setup.
"""
import json, os

ROOT   = "C:/Users/adebo/Reports/market-share-dashboard/MarketShare.Report/definition/pages"
SCHEMA = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.7.0/schema.json"

# page folder names
P1 = "WhereToGo_Products"
P2 = "a9b627c1a8f24c99"   # Where to go — Customers
P3 = "1e25c6fb43f75674"   # How to win — Account
P4 = "a20d73e7c3c08981"   # How to win — Growth targets

# ── layout constants (1920x1080) ──────────────────────────────────────────────
M  = 24   # margin
G  = 16   # gap
W  = 1920
# Rows (y positions):
Y_TITLE    = 20    # textbox already exists — DO NOT recreate
Y_SLICER   = 120
H_SLICER   = 48
Y_CARD     = 184
H_CARD     = 120
Y_CHART    = 320
H_CHART_LG = 740   # to y=1060

def slicer_w(n, usable=1920-48): return (usable - (n-1)*G) // n

def make_visual(name, vis_type, x, y, w, h, title):
    return {
        "$schema": SCHEMA,
        "name": name,
        "position": {"x": x, "y": y, "z": 0, "height": h, "width": w, "tabOrder": 0},
        "visual": {
            "visualType": vis_type,
            "query": {"queryState": {}},
            "visualContainerObjects": {
                "title": [{"properties": {
                    "show": {"expr": {"Literal": {"Value": "true"}}},
                    "text": {"expr": {"Literal": {"Value": f"'{title}'"}}}
                }}],
                "subTitle": [{"properties": {
                    "show": {"expr": {"Literal": {"Value": "false"}}}
                }}]
            },
            "drillFilterOtherVisuals": True
        }
    }

def write_visual(page_folder, vis_name, vis_data):
    folder = os.path.join(ROOT, page_folder, "visuals", vis_name)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, "visual.json"), "w", encoding="utf-8") as f:
        json.dump(vis_data, f, indent=2, ensure_ascii=False)

created = 0

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1 — Where to go: Products
# Slicers (3): Category | Procedure Group | Country
# Cards (6): Realization% | Realized Qty | Realized Revenue | Total Potential | Unit Gap | Revenue Gap
# Charts (3): Realization % | Revenue Importance | Unit Gap by Category
# ══════════════════════════════════════════════════════════════════════════════
sw3 = slicer_w(3)
for i, (slug, title) in enumerate([
    ("cat-slicer",  "Terumo Category"),
    ("proc-slicer", "Procedure Group"),
    ("cty-slicer",  "Country"),
]):
    write_visual(P1, slug, make_visual(slug, "slicer", M + i*(sw3+G), Y_SLICER, sw3, H_SLICER, title)); created+=1

cw6 = slicer_w(6)
for i, (slug, title) in enumerate([
    ("real-pct-card",  "Realization %"),
    ("real-qty-card",  "Realized Qty"),
    ("real-rev-card",  "Realized Revenue"),
    ("tot-pot-card",   "Total Potential"),
    ("unit-gap-card",  "Unit Gap"),
    ("rev-gap-card",   "Revenue Gap"),
]):
    write_visual(P1, slug, make_visual(slug, "cardVisual", M + i*(cw6+G), Y_CARD, cw6, H_CARD, title)); created+=1

cw3 = (W - 2*M - 2*G) // 3
for i, (slug, title) in enumerate([
    ("real-by-cat-bar",   "Realization by Category"),
    ("rev-imp-bar",       "Revenue Importance"),
    ("unit-gap-by-cat",   "Unit Gap by Category"),
]):
    write_visual(P1, slug, make_visual(slug, "clusteredBarChart", M + i*(cw3+G), Y_CHART, cw3, H_CHART_LG, title)); created+=1

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2 — Where to go: Customers
# Slicers (3): Category | Country | Customer Segment
# Cards (3): Active Customers | National Realization | Total Revenue
# Scatter (centrepiece, left 2/3)
# Table: Top opportunity accounts (right 1/3)
# ══════════════════════════════════════════════════════════════════════════════
for i, (slug, title) in enumerate([
    ("p2-cat-slicer",  "Terumo Category"),
    ("p2-cty-slicer",  "Country"),
    ("p2-seg-slicer",  "Customer Segment"),
]):
    write_visual(P2, slug, make_visual(slug, "slicer", M + i*(sw3+G), Y_SLICER, sw3, H_SLICER, title)); created+=1

cw3b = (W - 2*M - 2*G) // 3
for i, (slug, title) in enumerate([
    ("p2-active-cust-card", "Active Customers"),
    ("p2-natl-real-card",   "National Realization"),
    ("p2-tot-rev-card",     "Total Revenue"),
]):
    write_visual(P2, slug, make_visual(slug, "cardVisual", M + i*(cw3b+G), Y_CARD, cw3b, H_CARD, title)); created+=1

scatter_w = (W - 2*M - G) * 2 // 3
table_w   = W - 2*M - G - scatter_w
write_visual(P2, "customer-quadrant-scatter",
    make_visual("customer-quadrant-scatter", "scatterChart", M, Y_CHART, scatter_w, H_CHART_LG, "Customer Targeting Quadrant")); created+=1
write_visual(P2, "top-opp-accounts-table",
    make_visual("top-opp-accounts-table", "tableEx", M + scatter_w + G, Y_CHART, table_w, H_CHART_LG, "Top Opportunity Accounts")); created+=1

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 3 — How to win: Account  (drill-through)
# Slicers (4): Customer | Category | Country | Customer Segment
# Cards (6): RI | Realized Qty | Realized Revenue | Customer Potential | Category Coverage | Whitespace
# Bar chart (left ~55%): Penetration by Category
# Table (right ~45%): Category Mix
# Strength Badge card (below bar)
# ══════════════════════════════════════════════════════════════════════════════
sw4 = slicer_w(4)
for i, (slug, title) in enumerate([
    ("p3-cust-slicer", "Customer"),
    ("p3-cat-slicer",  "Terumo Category"),
    ("p3-cty-slicer",  "Country"),
    ("p3-seg-slicer",  "Customer Segment"),
]):
    write_visual(P3, slug, make_visual(slug, "slicer", M + i*(sw4+G), Y_SLICER, sw4, H_SLICER, title)); created+=1

cw6b = slicer_w(6)
for i, (slug, title) in enumerate([
    ("p3-ri-card",       "Realization Index"),
    ("p3-realqty-card",  "Realized Qty"),
    ("p3-realrev-card",  "Realized Revenue"),
    ("p3-custpot-card",  "Customer Potential"),
    ("p3-catcov-card",   "Category Coverage"),
    ("p3-white-card",    "Whitespace"),
]):
    write_visual(P3, slug, make_visual(slug, "cardVisual", M + i*(cw6b+G), Y_CARD, cw6b, H_CARD, title)); created+=1

bar_w = int((W - 2*M - G) * 0.55)
tbl_w = W - 2*M - G - bar_w
write_visual(P3, "penetration-by-cat-bar",
    make_visual("penetration-by-cat-bar", "clusteredBarChart", M, Y_CHART, bar_w, H_CHART_LG - 140, "Penetration by Category")); created+=1
write_visual(P3, "cat-mix-table",
    make_visual("cat-mix-table", "tableEx", M + bar_w + G, Y_CHART, tbl_w, H_CHART_LG - 140, "Category Mix")); created+=1
write_visual(P3, "p3-strength-badge-card",
    make_visual("p3-strength-badge-card", "cardVisual", M, Y_CHART + H_CHART_LG - 130, bar_w, 110, "Customer Strength Badge")); created+=1

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 4 — How to win: Growth targets  (drill-through)
# Slicers (3 + slider): Customer | Category | Country | Target RI (slider)
# Cards (2 header): Target RI Readout | Target Label
# Cards (4 milestone): RI 50 | RI 75 | RI 100 | RI 150
# Stacked bar (left 55%): Actual vs Needed
# Tables (right 45%): Customer goal-seek | Category breakdown (stacked vertically)
# ══════════════════════════════════════════════════════════════════════════════
sw3c = slicer_w(3, usable=W - 2*M - 340 - G)   # leave room for slider on right
for i, (slug, title) in enumerate([
    ("p4-cust-slicer", "Customer"),
    ("p4-cat-slicer",  "Terumo Category"),
    ("p4-cty-slicer",  "Country"),
]):
    write_visual(P4, slug, make_visual(slug, "slicer", M + i*(sw3c+G), Y_SLICER, sw3c, H_SLICER, title)); created+=1

# Target RI slider — far right of slicer row
write_visual(P4, "target-ri-slider",
    make_visual("target-ri-slider", "slicer", W - M - 320, Y_SLICER, 320, H_SLICER, "Target RI")); created+=1

# Header cards: RI readout + label (top, full-width split)
hw = (W - 2*M - G) // 2
write_visual(P4, "p4-tgt-ri-readout-card", make_visual("p4-tgt-ri-readout-card", "cardVisual", M, Y_CARD, hw, H_CARD, "Target RI Readout")); created+=1
write_visual(P4, "p4-tgt-label-card",      make_visual("p4-tgt-label-card",      "cardVisual", M + hw + G, Y_CARD, hw, H_CARD, "Target Label")); created+=1

# Milestone cards (4 side by side)
Y_MILE = Y_CARD + H_CARD + G
mw = (W - 2*M - 3*G) // 4
for i, (slug, title) in enumerate([
    ("p4-mi-50-card",  "Units to RI 50"),
    ("p4-mi-75-card",  "Units to RI 75"),
    ("p4-mi-100-card", "Units to RI 100"),
    ("p4-mi-150-card", "Units to RI 150"),
]):
    write_visual(P4, slug, make_visual(slug, "cardVisual", M + i*(mw+G), Y_MILE, mw, H_CARD, title)); created+=1

# Main chart + tables
Y_MAIN = Y_MILE + H_CARD + G
H_MAIN = 1080 - Y_MAIN - M
bar_w4 = int((W - 2*M - G) * 0.55)
tbl_w4 = W - 2*M - G - bar_w4
tbl_h_each = (H_MAIN - G) // 2

write_visual(P4, "actual-vs-needed-bar",
    make_visual("actual-vs-needed-bar", "stackedBarChart", M, Y_MAIN, bar_w4, H_MAIN, "Actual vs Needed Units")); created+=1
write_visual(P4, "cust-goal-seek-table",
    make_visual("cust-goal-seek-table", "tableEx", M + bar_w4 + G, Y_MAIN, tbl_w4, tbl_h_each, "Customer Goal-Seek")); created+=1
write_visual(P4, "cat-breakdown-table",
    make_visual("cat-breakdown-table", "tableEx", M + bar_w4 + G, Y_MAIN + tbl_h_each + G, tbl_w4, tbl_h_each, "Category Breakdown")); created+=1

print(f"Created {created} visuals across 4 pages.")
