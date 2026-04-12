# Market Share Dashboard — Go-Live Migration Guide
# From: adebo dev machine (stub model)
# To:   TE05426 work laptop (real potential_mod.bim + live CSVs)
# Updated: April 2026

---

## Overview

The dashboard was built on the dev machine with a **stub semantic model**
(`MarketShare.SemanticModel/model.bim`). The stub has the correct tables,
measures, and relationships, but points to placeholder CSV data.

On the work laptop:
- The real model file is `potential_mod.bim` (already at `C:\Users\TE05426\...`)
- The CSVs are at `C:\Users\TE05426\Downloads\QBR_Implementation\output\market_share_ready\`
- The stub M expressions already point to that path — so step 3 may be automatic

---

## Step 1 — Transfer the PBIP folder

Copy the entire folder to the work laptop:

```
C:\Users\adebo\Reports\market-share-dashboard\
  ├── MarketShare.pbip
  ├── MarketShare.Report\        <-- all 50 visuals, CF, formatting
  └── MarketShare.SemanticModel\ <-- stub model (to be replaced)
```

Recommended: zip and move via USB or OneDrive.

Target path on work laptop:
```
C:\Users\TE05426\Reports\market-share-dashboard\
```

---

## Step 2 — Replace the stub model.bim

The stub model.bim has 7 tables and ~38 measures.  
The real model (`potential_mod.bim`) has the full dataset including additional
tables: `DATA`, `UK-IE`, `Final Destination`, `Sales_Category`, mapping tables, etc.

**Replace:**
```
# On work laptop, overwrite the stub:
copy "C:\Users\TE05426\<path-to>\potential_mod.bim" `
     "C:\Users\TE05426\Reports\market-share-dashboard\MarketShare.SemanticModel\model.bim"
```

**Verify the 7 core tables are present in the real model:**

| Table | Purpose |
|---|---|
| `fact_market_potential` | All MS/Pot measures live here |
| `Dim_Cust` | Customer Name column |
| `dim_terumo_category` | terumo_category column |
| `dim_procedure` | procedure_group column |
| `Shp_Dim_Country_Hierarchy` | Country Text column |
| `Sales_Category` | Revenue data |
| `Target RI` | RI slider values (0, 5, 10 ... 200) |

If any table name differs in the real model, the visual bindings will break.
See "Fixing broken bindings" section below.

---

## Step 3 — Verify or update CSV source paths

The stub M expressions already reference:
```
C:\Users\TE05426\Downloads\QBR_Implementation\output\market_share_ready\
```

If the CSVs are at that exact path on the work laptop, Power BI Desktop
will load data immediately. If the path is different, update using:

```python
# fix_data_path_ms.py — run from market-share-dashboard folder
import json, re, pathlib

BIM = pathlib.Path("MarketShare.SemanticModel/model.bim")
NEW_PATH = r"C:\Users\TE05426\Downloads\QBR_Implementation\output\market_share_ready"
# Change NEW_PATH above if CSVs moved

content = BIM.read_text(encoding="utf-8")
# Replace any quoted Windows path that ends in market_share_ready\
content = re.sub(
    r'C:\\\\Users\\\\[^\\\\]+\\\\.*?market_share_ready\\\\',
    NEW_PATH.replace("\\", "\\\\") + "\\\\",
    content
)
BIM.write_text(content, encoding="utf-8")
print("Path updated.")
```

---

## Step 4 — Open in Power BI Desktop

```
Double-click: C:\Users\TE05426\Reports\market-share-dashboard\MarketShare.pbip
```

Expected on first open:
- Power BI Desktop loads the model and attempts to refresh
- If CSVs are at the correct path: data loads, visuals render, CF activates
- If CSVs not found: "Data source error" — fix path per Step 3 and retry
- 36 `RENDER_REQUIRED_ROLE_MISSING` warnings disappear once data loads

**What to verify after opening:**
- [ ] All 4 pages display correctly
- [ ] Slicers populate with values
- [ ] KPI cards show numbers
- [ ] Bar charts render with conditional colors (green/teal/amber/red)
- [ ] Customer Strength Badge card shows colored background
- [ ] Scatter chart on P2 shows customer quadrant
- [ ] RI slider on P4 is interactive (0–200, step 5)
- [ ] Category Breakdown table on P4 filters by the 5 visual-level filters

---

## Step 5 — Swap to live data (post-CSV validation)

Once the dashboard validates correctly on CSVs, move to the Salesforce/live source:

### 5a. Identify the live connection in potential_mod.bim

Open `model.bim` in a text editor, search for `"kind": "m"` partitions.  
Look for the source M expression in `fact_market_potential` and related tables.

**Before (CSV source in stub model):**
```json
"expression": [
  "let",
  "    Source = Csv.Document(File.Contents(\"C:\\\\Users\\\\TE05426\\\\...\\\\fact_market_potential.csv\"), ...)"
]
```

**After (live source — update to match real model partition):**
Replace with the M expression from `potential_mod.bim` that connects to
Salesforce / SQL / SharePoint — whatever the production source is.

### 5b. Or: use Update Data Source in Power BI Desktop

1. Open the report in Power BI Desktop
2. Home → Transform data → Data source settings
3. Change each CSV source to the live equivalent
4. Close & Apply
5. Refresh all tables

### 5c. Measure DAX — no changes needed

All 38 MS/Pot measures are already written against the correct column names.
As long as the real model has the same table/column structure, measures
carry over automatically.

**If column names differ in the real model**, use `pbir fields replace` to
swap column references across all visuals:
```bash
pbir fields replace "MarketShare.Report" \
  "old_table.old_column" "new_table.new_column"
```

---

## Step 6 — Publish to Fabric workspace (optional)

Once validated locally:

```bash
pbir publish "MarketShare.Report" "My Workspace.Workspace/MarketShare.Report" -f
```

If publishing to a different workspace than the semantic model lives in,
rebind first:
```bash
pbir report rebind "MarketShare.Report" --model-id "<semantic-model-id-in-target-workspace>"
```

---

## Fixing Broken Bindings (if table/column names differ)

If the real model has renamed tables or columns vs the stub, visuals will show
"Something went wrong" in Power BI Desktop. Fix per visual type:

**Find all affected fields:**
```bash
pbir fields list "MarketShare.Report"
```

**Replace a broken field across the whole report:**
```bash
pbir fields replace "MarketShare.Report" \
  "old_table.old_measure_name" \
  "new_table.new_measure_name" -f
```

**Or rebind individual visuals:**
```bash
pbir visuals bind "MarketShare.Report/Page.Page/Visual.Visual" \
  -c "Values"
pbir visuals bind "MarketShare.Report/Page.Page/Visual.Visual" \
  -a "Values:correct_table.correct_measure" -t Measure
```

---

## Extension Measures (CF colors — live in the report, not the model)

The following 5 measures are stored in `MarketShare.Report/definition/reportExtensions.json`
and do NOT need to be in the semantic model:

| Measure | Purpose |
|---|---|
| `_CF Realization Bar Color` | Bar color for Realization by Category (P1) |
| `_CF RI Bar Color` | Bar color for Realization Index chart (P3) |
| `_CF Strength Badge BG` | Background color for Customer Strength Badge (P3) |
| `_CF Strength Badge Text` | Text color for Customer Strength Badge (P3) |
| `_CF Mix Index BG` | Background color for Mix Index column in Category Mix table (P3) |

These reference model measures via `[Measure Name]` syntax. They will work
as long as the model measures they reference exist with the same names.

---

## Known Gaps to Address Post-Go-Live

| Item | Detail | Action |
|---|---|---|
| Active Customers card (P2) | Bound to `Pot Realized Qty` (volume), not customer count | Add `MS Active Customers = DISTINCTCOUNT(fact_market_potential[customer_id])` to model and rebind |
| Action Badge CF (P2/P3 tables) | Only Mix Index has table-level CF | Extend CF to `MS Customer Action Badge` column in `Top Opportunity Accounts` and `Category Mix` tables |
| P3 → P4 navigation button | Spec called for a forward nav button on P3 | Add via `pbir visuals action` after opening in Desktop |
| Gridlines | Spec: hide category gridlines, subtle value gridlines #E2E8F0 | Apply via `pbir set` on categoryAxis and valueAxis |

---

## Quick Reference — pbir commands on work laptop

```bash
# Install pbir (if not installed)
pip install pbir-cli

# Validate before/after any change
pbir validate "MarketShare.Report"

# Open in Power BI Desktop
pbir open "MarketShare.Report"

# Re-run field binding inspection
pbir tree "MarketShare.Report" -v

# Check all CF rules in use
pbir visuals cf "MarketShare.Report/**/*.Visual" 2>&1
```

---
*Generated: April 2026 | Dashboard: Terumo Market Share — Where to Go / How to Win*
