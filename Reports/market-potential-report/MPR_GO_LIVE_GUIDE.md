# Market Potential Report — Go-Live Guide

## Before opening in Power BI Desktop

### Step 1: Run potential_v2_measures.csx in Tabular Editor
This is REQUIRED before the report can bind to the model.

1. Open **Tabular Editor 2.28+**
2. Connect to the `potential` model (or open `potential.bim` directly)
3. Menu → File → Open → C# Script
4. Select `C:/Users/adebo/Downloads/potential_v2_measures.csx`
5. Press **F5** (Run Script)
6. Verify dialog: "Script complete. Created/updated measures in 'fact_market_potential'"
7. **Ctrl+S** to save the model

**What the script creates:**
- `_Current Sales Year` / `_Current Potential Year` — dynamic year helpers
- `Pot Total Potential Units (Latest)` — replaces hardcoded "2024" version
- 6 new MS Revenue-Weighted measures
- 4 new "How to Win — In this Category" measures
- 5 new Executive Summary measures
- Fixes 8 existing measures to use dynamic years
- Reorganizes display folders under `MS v2\`

---

### Step 2: Copy report to work laptop (TE05426)
```
Source:  C:\Users\adebo\reports\market-potential-report\
Dest:    <work laptop reports folder>\market-potential-report\
```
Transfer both:
- `Market Potential Report.Report\`  ← the report
- `potential.bim`  ← from `C:\Users\adebo\reports\potential_db\potential.bim`

---

### Step 3: Connect report to model in Power BI Desktop

1. Open `Market Potential Report.pbip` in Power BI Desktop
2. If prompted for data source, point to `potential.bim` (or the live workspace)
3. Check **all 5 pages** render without errors
4. Fix any RENDER_REQUIRED errors from missing measures (run Tabular Editor step first)

---

## Page Reference

| Page | Folder Name | Purpose |
|---|---|---|
| 1 | ExecutiveOverview | Portfolio health at a glance |
| 2 | AccountLandscape (49be14b5...) | Category revenue opportunity |
| 3 | CategoryDeepDive (55d24ffa...) | Customer scatter + detail |
| 4 | AccountPriority (d228ca41...) | How to Win by Category |
| 5 | HowToWin (3a5d3709...) | How to Win by Account |

---

## Extension CF Measures (in report, not model)

These live in `reportExtensions.json` and require no model changes:

| Measure | Purpose |
|---|---|
| `_CF RI BG` | Table cell background by RI range |
| `_CF RI Text` | Table cell text color by RI range |
| `_CF Action BG` | Action Badge background (Protect/Maintain/Monitor/Grow) |
| `_CF Action Text` | Action Badge text color |
| `_CF CatAction BG` | Customer Action in Category background |
| `_CF TargetStatus BG` | Target Status background |
| `_CF RI Bar` | Bar chart bar color by RI |

---

## Post-connection CF to add manually in Power BI Desktop

These require a live model connection (can't be done offline):

1. **Customer Strength Badge cards (P5)** — background color by badge value
   - Apply background CF using `_CF Action BG` measure

2. **Action Flag column in P2 table** — background CF
   - Use field rule: Focus→red, Capture→amber, Optimise→blue, Keep→green

3. **Scatter bubble colors (P3)** — color by Action Badge
   - In Format pane → Markers → Color → Field value → `MS Customer Action Badge`
   - Note: requires a column-type field or CF measure

---

## Slicer Sync (set in Power BI Desktop)

After connecting to model, configure slicer sync:
- `Country Text` → sync across ALL 5 pages
- `customer_segment` → sync P1, P3, P4, P5
- `terumo_category` → sync P1–P4 (multi-select); P4 should be single-select
- `Customer Name` → sync P3, P5 (single-select)
- `Target RI` → P5 only (numeric slider)

---

## Drillthrough Setup (Power BI Desktop)

| From | To | Field |
|---|---|---|
| P2 category bar/table | P4 (Account Priority) | terumo_category |
| P3 customer table | P5 (How to Win) | Customer Name |
| P4 customer bar/table | P5 (How to Win) | Customer Name + terumo_category |

---

## Validation Checklist

- [ ] `_Current Sales Year` returns correct year
- [ ] `Pot Total Potential Units (Latest)` matches old `(2024)` version
- [ ] RI values are in reasonable range (50–300 for most accounts; max ~500)
- [ ] CF colors render on P2 RI bar chart
- [ ] CF RI background renders in P2, P3, P4, P5 tables
- [ ] P5 slicer for Customer Name filters all visuals on the page
- [ ] P5 Target RI slider updates "Units to reach RI X" cards
- [ ] Country slicer change on P1 persists when navigating to P2
