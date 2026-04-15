# Build Clarifications & Handoff Pack

## Answers to all open questions

---

### 1. Model files location

The `.bim` file is at `potential_db/potential.bim` in this package. It is the live Tabular model with all 40+ tables, relationships, and 240+ measures. When building against dummy data, ignore the M query sources — they point to the live SAP/Snowflake pipeline. Instead, swap each table's partition source to the matching CSV in `potential_db/data/`.

For live deployment, the target path on your machine is `C:\Users\adebo\reports\potential db`. Copy this entire `potential_db/` folder there.

**Field name alignment**: Every column name in the dummy CSVs matches the `.bim` schema exactly, including the typo in `Dim_Cust[TIS Final Segmenation]` (missing 't' — do not correct, the live model uses this spelling).

---

### 2. Source files — complete inventory

```
potential_db/
├── potential.bim                           ← Tabular model (read-only reference)
├── data/
│   ├── dim_terumo_category.csv            ← 10 product categories
│   ├── dim_procedure.csv                  ← 7 procedure groups
│   ├── dim_cust.csv                       ← 120 customers (12 per country × 10 countries)
│   ├── dim_customer_market.csv            ← Customer-market mapping
│   ├── shp_dim_country_hierarchy.csv      ← 10 EMEA countries with hierarchy
│   ├── bridge_procedure_to_terumo.csv     ← 26 procedure→category links
│   ├── map_product_to_terumo_category.csv ← 16 product→category mappings
│   ├── fact_market_potential.csv           ← 2,185 rows (customer × procedure × category)
│   ├── sales_category.csv                 ← 638 rows (customer × category realized sales)
│   ├── target_ri.csv                      ← What-if parameter values (50, 75, 100, 125, 150)
│   ├── mapping_estimates_detail.csv       ← 49 rows (procedure→product assumptions)
│   ├── segmentation_cardio.csv            ← 120 rows
│   ├── segmentation_pi.csv               ← 120 rows
│   └── segmentation_io.csv               ← 120 rows
├── scripts/
│   ├── potential_v2_measures.csx          ← Tabular Editor C# script (run first)
│   └── generate_dummy_data.py            ← Re-runnable data generator (seed=42, deterministic)
├── specs/
│   └── DASHBOARD_SPEC.md                  ← Full 5-page visual specification
├── docs/
│   └── LIVE_BINDING_INVENTORY.csv         ← v1 dashboard bindings (reference only)
└── BUILD_CLARIFICATIONS.md                ← This file
```

---

### 3. Page canvas standard

**16:9 standard Power BI canvas (1280 × 720 px).**

This is the default for Power BI Desktop and Service. Do not use custom or 16:10. All page layouts in `DASHBOARD_SPEC.md` are designed for this ratio.

Canvas settings:
- Type: Tooltip pages use 320 × 240 px
- All 5 main pages: 1280 × 720
- Page view: "Fit to page"
- No mobile layout in v1

---

### 4. Priority score definitions — exact formulas

All measures below are created by `potential_v2_measures.csx`. Here are the exact DAX expressions for reference:

#### MS Account Priority Score (existing, on fact_market_potential)
```dax
VAR CustRank =
    RANKX (
        ALL ( Dim_Cust[Customer] ),
        [Pot Realized Qty],
        , DESC, DENSE
    )
VAR CustCount =
    CALCULATE (
        DISTINCTCOUNT ( Sales_Category[Customer Id] ),
        REMOVEFILTERS ( Dim_Cust )
    )
VAR SizeScore = CustCount - CustRank + 1
VAR Whitespace = [MS Whitespace Count]
RETURN
    IF (
        ISBLANK ( Whitespace ) || Whitespace = 0,
        0,
        SizeScore * Whitespace
    )
```
**Interpretation**: Large customers (high SizeScore) with many un-bought categories (high Whitespace) score highest. A customer ranked #1 by volume with 4 whitespace categories will far outscore a small customer with 1 whitespace.

#### MS Category Priority Score (existing, on fact_market_potential)
```dax
VAR GapEUR = [Pot Gap EUR]
VAR RI = [MS Realization Index]
RETURN
    IF (
        ISBLANK ( GapEUR ) || ISBLANK ( RI ),
        BLANK (),
        ROUND ( GapEUR * DIVIDE ( MAX ( 0, 150 - RI ), 100, 0 ), 0 )
    )
```
**Interpretation**: Categories with large EUR gap AND low RI score highest. At RI=0, multiplier is 1.5×. At RI=100, multiplier is 0.5×. At RI=150+, score drops to 0.

#### MS Revenue-Weighted Category Priority (new, on fact_market_potential)
```dax
VAR GapEUR = [Pot Gap EUR]
VAR Share = [MS Estimated Share %]
RETURN
    IF (
        ISBLANK ( GapEUR ),
        BLANK (),
        ROUND ( GapEUR * ( 1 - COALESCE ( Share, 0 ) ), 0 )
    )
```
**Interpretation**: Gap EUR discounted by current share. A €500K gap at 5% share (priority = €475K) outscores a €500K gap at 40% share (priority = €300K).

#### MS Customer Priority in Category (new, on fact_market_potential)
```dax
VAR GapUnits = [Pot Gap Units]
VAR RI = [MS Realization Index]
VAR RevShare = [MS Customer Revenue Share]
RETURN
    IF (
        ISBLANK ( GapUnits ) || GapUnits <= 0,
        0,
        ROUND (
            GapUnits
            * COALESCE ( RevShare, 0.01 )
            * DIVIDE ( MAX ( 0, 150 - COALESCE ( RI, 0 ) ), 100, 0 ),
            0
        )
    )
```
**Interpretation**: For a selected category, ranks customers by: gap size × revenue importance × room-to-grow. Ensures we don't chase tiny accounts with large gaps.

---

### 5. Action badge logic — complete business mapping

#### MS Customer Action Badge (on scatter charts and customer tables)

| RI range | Badge | Color | Meaning |
|---|---|---|---|
| ≥ 150 | **Protect** | Green (#EAF3DE / #27500A) | Outperforming peers. Guard this position — competitor displacement risk. |
| 100–149 | **Maintain** | Blue (#E6F1FB / #0C447C) | At or above benchmark. Keep current coverage, no heavy investment needed. |
| 50–99 | **Monitor** | Amber (#FAEEDA / #633806) | Below average but not critical. Selective growth plays. |
| < 50 | **Grow** | Red (#FCEBEB / #791F1F) | Significantly under-penetrated. Highest growth ROI if account is strategic. |

#### MS Customer Strength Badge (on account detail cards)

| RI range | Badge | Meaning |
|---|---|---|
| ≥ 150 | **Champion** | Top-tier account. Reference site potential. |
| 100–149 | **Above average** | Healthy. Expand to whitespace categories. |
| 50–99 | **Below average** | Underperforming peers. Investigate barriers. |
| < 50 | **Growth target** | Major opportunity if account size warrants investment. |

#### MS Action Flag (on category detail tables within an account)

| Condition | Flag | Meaning |
|---|---|---|
| Gap ≤ 0 | **Keep Protecting** | Fully penetrated at or above target. Defend. |
| RI < 80, Gap > 0 | **Focus as Priority** | Large gap, low penetration. Primary sales action. |
| 80 ≤ RI < 100, Gap > 0 | **Capture Potential** | Near target but not there. Close the last gap. |
| RI ≥ 100, Gap > 0 | **Optimise Contact** | Above benchmark but gap exists due to target ceiling. Light touch. |

#### MS Customer Action in Category (on "In this category" page)

| Condition | Label | Meaning |
|---|---|---|
| Gap ≤ 0 | **Fully Penetrated** | No action needed in this account for this category. |
| RI < 50 | **Priority Target** | Highest-priority customer for this category. |
| 50 ≤ RI < 80 | **Growth Opportunity** | Meaningful gap, moderate effort to close. |
| 80 ≤ RI < 100 | **Capture Remaining** | Almost there — incremental push. |
| RI ≥ 100 | **Protect Position** | At or above benchmark. Maintain relationship. |

#### MS Current vs Target Status (on growth targets section)

| Condition | Status | Color |
|---|---|---|
| RI ≥ Target RI | **Achieved** | Green |
| RI ≥ Target × 0.75 | **Near target** | Yellow |
| RI ≥ Target × 0.50 | **Halfway** | Amber |
| RI < Target × 0.50 | **Below target** | Red |

---

### 6. Default ranking/sort rules

| Page | Visual | Default sort | Direction |
|---|---|---|---|
| **Page 1: Executive** | Category stacked bar | Pot Realized Sales EUR + Pot Gap EUR (total) | Descending |
| **Page 1: Executive** | Country table | Pot Gap EUR | Descending |
| **Page 1: Executive** | Country scatter | No sort (position encodes data) | — |
| **Page 2: Products** | Revenue opportunity bar | Pot Realized Sales EUR + Pot Gap EUR (total) | Descending |
| **Page 2: Products** | Category revenue share bar | MS Category Revenue Share | Descending |
| **Page 2: Products** | RI bar | MS Realization Index | Ascending (worst first) |
| **Page 2: Products** | Detail table | MS Revenue-Weighted Category Priority | Descending |
| **Page 3: Customers** | Scatter | No sort (position encodes data) | — |
| **Page 3: Customers** | Detail table | Pot Gap EUR | Descending |
| **Page 4: In this category** | Customer gap bar (Top N=20) | Pot Gap Units | Descending |
| **Page 4: In this category** | Detail table | MS Customer Priority in Category | Descending |
| **Page 5: In this account** | RI bar by category | MS Realization Index | Ascending (worst first) |
| **Page 5: In this account** | Mix table | MS Mix Index | Descending |
| **Page 5: In this account** | Growth target bar | MS Units to Target | Descending |
| **Page 5: In this account** | Growth target table | MS Units to Target | Descending |

---

### 7. Country rollout scope

**All 10 countries in the model from day one.** No pilot restriction.

The dummy data covers: DE, FR, GB, IT, ES, NL, BE, PL, TR, SE. The live model includes more countries via `Shp_Dim_Country_Hierarchy`, but the dashboard design and measures are country-agnostic — the RI benchmark cascade handles sparse data gracefully. No measure or visual needs country-specific logic.

The `Country Text` slicer allows filtering to any country. If stakeholders want to demo with one country first, they simply filter — no build change needed.

---

### 8. Success criteria for sign-off

#### Must-have for v1 sign-off

| # | Criterion | Verification method |
|---|---|---|
| 1 | All 5 pages built with visuals matching DASHBOARD_SPEC.md | Visual inspection against spec wireframes |
| 2 | Drillthrough working: Products → In this category (by category) | Click category row → page 4 opens with category pre-filtered |
| 3 | Drillthrough working: Customers → In this account (by customer) | Click customer row → page 5 opens with customer pre-filtered |
| 4 | Drillthrough working: In this category → In this account (customer + category) | Click customer row on page 4 → page 5 opens with both filters |
| 5 | Slicer sync: Country Text synced across all 5 pages | Change country on page 1, navigate to page 3 — filter persists |
| 6 | What-if slider on page 5 updates all RI target measures | Slide Target RI to 75 → Units to Target, Units to Reach RI cards, and bar chart update |
| 7 | Key measures validated against 3 sample accounts | Pick 1 champion, 1 below-average, 1 growth-target customer. Manually verify RI, Gap, Benchmark Level |
| 8 | Conditional formatting applied to all tables per spec | RI background colors, Action badge colors, Status colors — all correct |
| 9 | No blank/error cards when no filter is applied | All 6 executive cards show valid totals at "All countries / All segments" |
| 10 | Performance: page load < 5 seconds on dummy data | Time each page transition |

#### Nice-to-have for v1 (can defer to v1.1)

- Tooltip pages with contextual measures
- Navigation buttons on page 1
- Bookmark presets ("Top 10 growth accounts")
- Performance testing under RLS

---

### 9. RLS expectation for v1

**Proceed without RLS on potential tables for v1.** This is an internal pilot for Commercial Excellence — all users in the pilot have EMEA-wide visibility.

For v1.1 (post-pilot), RLS must extend to `fact_market_potential` and `Sales_Category` via:
```
-- Conceptual role filter path:
Dim_Cust[Customer]
  → fact_market_potential[customer_id] (existing relationship)
  → Shp_Dim_Country_Hierarchy[Index_Branch_CountryFinalDestination]
    → Security table (Branch Code filter)
```

This requires adding a relationship from `Sales_Category` or `fact_market_potential` through to the country hierarchy and security tables. Flag it as a known gap in the report documentation but do not block v1 delivery.

---

### 10. Sample output — deliverables format

**Implementation-ready files plus a polished handoff pack.** Both.

The handoff pack contents are provided in this document:
- Page-by-page build checklist (Section A below)
- Visual inventory (Section B below)
- Testing script (Section C below)
- Stakeholder demo narrative (Section D below)

---

### 11. Dummy data spec — plug-and-play design

The dummy data in `potential_db/data/` is designed for zero-friction swap to live data:

#### Schema contract

Every CSV matches the exact column names and data types in the `.bim` file. When switching to live:

| Dummy CSV | Replace with | Source |
|---|---|---|
| `dim_terumo_category.csv` | Power Query from pipeline | Keep as-is if categories haven't changed |
| `dim_procedure.csv` | Power Query from pipeline | Keep as-is if procedures haven't changed |
| `dim_cust.csv` | SAP master data via existing Dim_Cust query | Replace partition source |
| `shp_dim_country_hierarchy.csv` | Existing model query | Replace partition source |
| `fact_market_potential.csv` | Pipeline output | Replace partition source |
| `sales_category.csv` | Power Query (built from DATA + product mapping) | Already defined in .bim |
| `bridge_procedure_to_terumo.csv` | Pipeline output | Replace partition source |
| `map_product_to_terumo_category.csv` | Pipeline output | Replace partition source |
| `target_ri.csv` | Calculated table (already in .bim) | No change needed |

#### Data characteristics

The generator (`generate_dummy_data.py`) produces data with these properties:

- **120 customers** across 10 countries (12 per country), with realistic hospital names per locale
- **4 customer archetypes** randomly assigned: champion (~20%), above_avg (~25%), below_avg (~30%), growth_target (~25%). This creates a natural distribution of RI values from <20 to >200.
- **Procedure volumes** scaled by country population weight (DE highest, SE/NL lowest) and hospital type (university hospitals get 2.5× multiplier)
- **Category coverage**: each customer buys 3–9 out of 10 categories, creating whitespace patterns
- **ASP variation**: ±15% around category reference price, creating realistic revenue distributions
- **Seed = 42**: deterministic. Same data every run. Change seed for a different distribution.
- **Year**: potential data is "2024", sales data is "2025" — matches the live model's convention

#### Regeneration

```bash
cd potential_db
python scripts/generate_dummy_data.py --output-dir ./data
```

To change scale: edit `n_per_country` in `generate_customers()` (default 12). For stress testing, set to 50 (600 customers, ~10K potential rows).

---

## Section A: Page-by-page build checklist

### Pre-build

- [ ] Copy `potential_db/` to `C:\Users\adebo\reports\potential db`
- [ ] Open `potential.bim` in Tabular Editor 2.28+
- [ ] Run `scripts/potential_v2_measures.csx` (File → Open Script → Run)
- [ ] Verify `_Current Sales Year` evaluates to `2025`
- [ ] Verify `_Current Potential Year` evaluates to `"2024"`
- [ ] Save model (Ctrl+S)
- [ ] Open Power BI Desktop → Get Data → CSV → point to `data/` folder
- [ ] Import all 14 CSVs
- [ ] Create relationships per Section "Key relationships" in DASHBOARD_SPEC.md
- [ ] Verify model loads without errors

### Page 1: Executive overview

- [ ] Create page, rename to "Executive overview"
- [ ] Add 3 slicers: Country Text, customer_segment, terumo_category (all multi-select dropdown)
- [ ] Add 6 cards: MS Total Addressable Market EUR, Pot Realized Sales EUR, MS Total Gap EUR, MS Portfolio Realization Pct, MS Champion Account Count, MS Growth Target Account Count
- [ ] Add stacked bar chart: terumo_category axis, Pot Realized Sales EUR + Pot Gap EUR values
- [ ] Add treemap: terumo_category group, Pot Gap EUR size, MS Realization Index color saturation
- [ ] Add scatter chart: Pot Realized Sales EUR (X), MS Realization Index (Y), Pot Gap EUR (size), Country Text (detail), reference line at RI=100
- [ ] Add country table: Country Text, Pot Realized Sales EUR, MS Realization Index, Pot Gap EUR, MS Growth Target Account Count, MS Champion Account Count
- [ ] Apply conditional formatting per spec
- [ ] Verify cross-filtering works between all visuals

### Page 2: Where to go — Products

- [ ] Create page, rename
- [ ] Add 3 slicers: Country Text, procedure_group, terumo_category
- [ ] Add 6 cards: Pot Realized Sales EUR, Pot Realized Qty, Pot Total Potential Units, Pot Gap Units, Pot Gap EUR, Pot Potential Value EUR
- [ ] Add horizontal clustered bar: terumo_category axis, Pot Realized Sales EUR + Pot Gap EUR
- [ ] Add revenue share bar: terumo_category, MS Category Revenue Share
- [ ] Add RI bar: terumo_category, MS Realization Index, reference line at 100, conditional color
- [ ] Add detail table with 10 columns per spec, sort by MS Revenue-Weighted Category Priority desc
- [ ] Apply conditional formatting: RI scale + Action Flag colors
- [ ] Configure drillthrough: right-click category → "In this category" (page 4)

### Page 3: Where to go — Customers

- [ ] Create page, rename
- [ ] Add 4 slicers: Country Text, customer_segment, terumo_category, (Customer Name optional)
- [ ] Add 4 cards: Pot Realized Sales EUR, Pot Realized Qty, MS National Realization Pct, MS Revenue Concentration Top20
- [ ] Add scatter chart: Pot Realized Sales EUR (X), MS Realization Index (Y), MS Weighted Opportunity Score (size), MS Customer Action Badge (legend), Customer Name (detail)
- [ ] Add reference lines: RI=100 ("Peer average"), RI=50 ("Growth threshold" dashed)
- [ ] Add quadrant text annotations
- [ ] Add detail table with 10 columns per spec, sort by Pot Gap EUR desc
- [ ] Apply conditional formatting
- [ ] Configure drillthrough: right-click customer → "In this account" (page 5)

### Page 4: How to win — In this category (NEW)

- [ ] Create page, rename
- [ ] Add 3 slicers: Country Text, customer_segment, terumo_category (**single-select, no "Select all"**)
- [ ] Add 5 cards: Pot Realized Sales EUR, MS Category Revenue Share, MS Category Customer Count, MS Category Whitespace Customers, MS Realization Index
- [ ] Add horizontal bar chart: Customer Name axis, Pot Realized Qty + Pot Gap Units values, Top N=20 by Pot Gap Units
- [ ] Add detail table: Customer Name, customer_segment, Country Text, Pot Realized Qty, Pot Realized Sales EUR, MS Realization Index, Pot Gap Units, Pot Gap EUR, MS Customer Priority in Category, MS Customer Action in Category
- [ ] Sort by MS Customer Priority in Category desc
- [ ] Apply conditional formatting
- [ ] Configure drillthrough: right-click customer → "In this account" (page 5), passing both customer + category
- [ ] Set as drillthrough target FROM page 2 (receives terumo_category)

### Page 5: How to win — In this account

- [ ] Create page, rename
- [ ] Add 5 slicers: Country Text, customer_segment, terumo_category, Customer Name (**single-select**), Target RI Value (slider)
- [ ] Add 6 cards: Pot Realized Sales EUR, Pot Realized Qty, MS Realization Index, MS Customer Strength Badge, MS Category Coverage, MS Whitespace Count
- [ ] Add RI bar chart: terumo_category axis, MS Realization Index value, reference line at 100, conditional color
- [ ] Add mix table: terumo_category, MS Customer Category Mix, MS National Category Mix, MS Mix Index, MS Realization Index, MS Customer Action Badge, MS Benchmark Level
- [ ] Add growth target section header: MS Target RI Label (card or text)
- [ ] Add 4 target cards: MS Units to Reach RI 50/75/100/150
- [ ] Add stacked bar: terumo_category, Pot Realized Qty + MS Units to Target
- [ ] Add growth table: terumo_category, Pot Realized Qty, Pot Total Potential Units, MS Realization Index, MS Units to Target, MS Current vs Target Status, Pot Gap EUR, MS Action Flag
- [ ] Apply conditional formatting
- [ ] Set as drillthrough target FROM pages 3 and 4

### Post-build

- [ ] Configure slicer sync groups (Country Text across all pages)
- [ ] Add back-buttons on pages 4 and 5
- [ ] Add navigation buttons on page 1 (→ Products, → Customers)
- [ ] Set page 1 as default landing page
- [ ] Run validation checklist (Section C)

---

## Section B: Visual inventory (v2 complete)

| Page | # | Visual type | Primary measures |
|---|---|---|---|
| 1. Executive | 1 | 6× card | TAM EUR, Realized EUR, Gap EUR, Portfolio Realization %, Champion count, Growth Target count |
| 1. Executive | 2 | Stacked bar | Realized EUR + Gap EUR by category |
| 1. Executive | 3 | Treemap | Gap EUR size, RI color by category |
| 1. Executive | 4 | Scatter | Realized EUR × RI by country |
| 1. Executive | 5 | Table | Country summary with RI, Gap, account counts |
| 2. Products | 1 | 6× card | Realized EUR, Realized Qty, Total Potential, Gap Units, Gap EUR, Potential Value EUR |
| 2. Products | 2 | Horizontal bar | Realized EUR + Gap EUR by category |
| 2. Products | 3 | Bar | Category Revenue Share |
| 2. Products | 4 | Bar | RI by category (conditional color) |
| 2. Products | 5 | Table | Category detail (10 columns) |
| 3. Customers | 1 | 4× card | Realized EUR, Realized Qty, National RI, Revenue Concentration |
| 3. Customers | 2 | Scatter | Realized EUR × RI × Gap by customer |
| 3. Customers | 3 | Table | Customer detail (10 columns) |
| 4. In this category | 1 | 5× card | Realized EUR, Revenue Share, Customer Count, Whitespace, RI |
| 4. In this category | 2 | Horizontal bar | Realized Qty + Gap Units by customer (Top 20) |
| 4. In this category | 3 | Table | Customer detail in category (10 columns) |
| 5. In this account | 1 | 6× card | Realized EUR, Realized Qty, RI, Strength Badge, Coverage, Whitespace |
| 5. In this account | 2 | Bar | RI by category (conditional color) |
| 5. In this account | 3 | Table | Category mix analysis (7 columns) |
| 5. In this account | 4 | 4× card | Units to RI 50/75/100/150 |
| 5. In this account | 5 | Stacked bar | Realized + Gap to Target by category |
| 5. In this account | 6 | Table | Growth target detail (8 columns) |
| **Total** | | **~30 visuals** | **across 5 pages** |

---

## Section C: Testing script

Run this validation after the build is complete:

### Test 1: Executive totals (no filters)

1. Navigate to Page 1 with all slicers cleared
2. Verify `MS Total Addressable Market EUR` card shows a positive value
3. Verify `Pot Realized Sales EUR` < `MS Total Addressable Market EUR`
4. Verify `MS Portfolio Realization Pct` is between 5% and 60%
5. Verify `MS Champion Account Count` + `MS Growth Target Account Count` < total customer count

### Test 2: Country filter propagation

1. On Page 1, select "Germany" in Country Text slicer
2. All cards and visuals should update to Germany-only values
3. Navigate to Page 3 (Customers)
4. Verify Country Text slicer still shows "Germany" selected
5. Verify customer table only shows German customers

### Test 3: Sample account validation (champion)

1. On Page 3, find a customer with RI ≥ 150 (green badge = "Protect")
2. Right-click → Drillthrough → "In this account"
3. On Page 5, verify:
   - MS Customer Strength Badge = "Champion"
   - MS Category Coverage > 50%
   - Most categories show RI > 100 in the bar chart
   - Growth target cards show 0 for RI 50/75/100 (already exceeded)
   - MS Action Flag for most categories = "Keep Protecting" or "Optimise Contact"

### Test 4: Sample account validation (growth target)

1. On Page 3, find a customer with RI < 50 (red badge = "Grow")
2. Right-click → Drillthrough → "In this account"
3. On Page 5, verify:
   - MS Customer Strength Badge = "Growth target"
   - MS Whitespace Count > 0
   - Multiple categories show RI < 50 in the bar chart
   - Growth target cards show positive values for all RI levels
   - MS Action Flag shows "Focus as Priority" for low-RI categories

### Test 5: Category drillthrough

1. On Page 2, right-click "Guide Wires" in the table → Drillthrough → "In this category"
2. On Page 4, verify:
   - terumo_category slicer shows "Guide Wires" selected
   - Customer bar chart shows Top 20 accounts by gap
   - Detail table shows customers with their priority scores and action labels
3. Right-click the top customer in the table → Drillthrough → "In this account"
4. On Page 5, verify customer is pre-filtered and Guide Wires category context is visible

### Test 6: What-if parameter

1. On Page 5, select any customer
2. Drag Target RI slider from 100 to 50
3. Verify: MS Units to Target values decrease (easier target)
4. Verify: MS Current vs Target Status shifts (more accounts show "Achieved")
5. Drag to 150
6. Verify: MS Units to Target values increase (harder target)

### Test 7: Edge cases

1. Filter to a country with few customers (SE or NL)
2. Verify no blank/error cards — all measures should return 0 or valid values
3. On Page 5, select a customer with only 3 categories bought
4. Verify MS Whitespace Count = 7 (10 total − 3 bought)
5. Verify categories not bought do NOT appear in the RI bar chart (visual filter: Pot Realized Qty > 0)

---

## Section D: Stakeholder demo narrative

Use this script when walking stakeholders through the dashboard for the first time.

**Opening (Page 1 — Executive overview, 2 minutes)**

> "This is your portfolio health check. At the top: total addressable market in EUR — what we could capture if we reached peer benchmark in every account. Next to it: what we're actually capturing, and the gap. The treemap on the right shows where that gap concentrates — bigger blocks mean bigger EUR opportunity, darker colors mean lower realization relative to peers. The scatter at the bottom plots each country: X axis is current revenue, Y axis is Realization Index. Countries below the 100 line are underperforming their peer benchmark — that's where the growth is."

**Direction (Pages 2–3 — Where to go, 3 minutes)**

> "Now let's decide where to go. Page 2 answers 'which product categories.' The horizontal bars show current revenue in blue and the gap in amber. This is sorted by total addressable value — the biggest bars are the biggest markets. The table below ranks categories by revenue-weighted priority: categories where the gap is large AND our current share is low surface first. The Action Flag column tells you exactly what to do."

> "Page 3 answers 'which customers.' The scatter plot is your account portfolio map. Top-right quadrant: high revenue, high RI — protect these. Bottom-right: high revenue but low RI — these are urgent, we're underperforming in important accounts. The bubble size shows opportunity in EUR. Click any dot to see the detail table filter."

**Action (Pages 4–5 — How to win, 3 minutes)**

> "Once you've identified a category to grow — say Guide Wires — drill through to Page 4. This shows you the top 20 accounts with the biggest gap in that specific category. The priority score combines gap size, account importance, and current penetration. Pick your targets here."

> "Then drill into a specific account on Page 5. This is your call prep page. The RI bar shows which categories you're strong in and which you're weak. The mix table compares this customer's category spending pattern against the national average — a Mix Index below 100 means they're underweight in that category. The growth targets at the bottom give you concrete unit numbers: 'You need 340 more Guide Wire units to reach peer average in this account.'"

**Close**

> "The dashboard doesn't ask questions — it gives answers. Every page ends with an action: Protect, Grow, Focus, Capture. The numbers are benchmarked against peers, not against 100% market share, so the targets are realistic. Filter by country for your territory, drill into your accounts, and use the growth targets for your next QBR."
