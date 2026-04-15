# Market Potential Dashboard v2 — Build Specification

## Purpose

This document is a complete specification for rebuilding the TIS Market Potential & Opportunity Dashboard in Power BI. It is intended to be consumed by an AI coding agent (Claude Code) or a Power BI developer to produce a fully functional `.pbix` report from an existing Tabular model (`.bim` file).

The dashboard answers two strategic questions for Terumo Interventional Systems (TIS) Commercial Excellence:

1. **Where to go** — Which product categories and which customer accounts hold the biggest *revenue-weighted* growth opportunity, benchmarked against peers?
2. **How to win** — For a chosen product category or customer account, what specific actions drive realization toward target?

The dashboard must not pose questions. It must provide direction and action.

---

## Design principles

| Principle | What it means in practice |
|---|---|
| Revenue-first | Every page leads with EUR values. Units are supporting context, never the headline. |
| Relative, not absolute | Realization Index (RI) — not raw share % — is the primary performance metric. RI benchmarks against country+segment peers, so cross-country comparison works without currency/volume normalization. |
| No 100% assumption | "Targetable" is defined as benchmark share × total potential, never 100% of market. |
| Generic before country-specific | No page is designed around a single country. Slicers allow filtering, but layouts and measures work identically across EMEA. |
| Action-oriented | Every data point connects to a badge, flag, or priority score that tells the user what to *do*. |

---

## Data model summary

### Source tables

| Table | Role | Key columns |
|---|---|---|
| `fact_market_potential` | Market potential fact | customer_id, terumo_category, procedure_group, year, procedures, qty_units_per_procedure, usage_rate_final, allocation_weight |
| `Sales_Category` | Realized sales fact | Customer Id, Terumo Category, Year, Qty Sold, Sales EUR |
| `DATA` | Legacy sales/GP fact | Customer, Date, Final_Material, Net Sales Actual, Deemed Cost, FxtoEUR |
| `Dim_Cust` | Customer dimension | Customer, Customer Name, Country Text, TIS Final Segmenation, Customer Combined |
| `dim_terumo_category` | Product category dimension | terumo_category, terumo_category_key |
| `dim_procedure` | Procedure dimension | procedure_group, procedure_group_key |
| `Dim_Cal` | Calendar/fiscal dimension | Date, Fiscal Year, IsFiscCY, IsFiscYTD |
| `Dim_Product` | Product hierarchy | Material, Product Group Text, Product Subgroup Text, Product Area Text |
| `Shp_Dim_Country_Hierarchy` | Geography hierarchy | Country, Country Text, Region, Cluster, Branch Code, Branch Name |
| `dim_customer_market` | Customer market mapping | customer_id, customer_market_key, country_iso2 |
| `bridge_procedure_to_terumo` | Procedure→category bridge | procedure_group_key, terumo_category_key, qty_units_per_procedure, usage_rate_final |
| `map_product_to_terumo_category` | Product→category mapping | product_group_text, product_subgroup_text, terumo_category |
| `Target RI` | What-if parameter table | Value (single column, default 100) |
| `Segmentation Cardio/PI/IO` | Customer segmentation | SAP Nb, *Segmentation |

### Key relationships

- `fact_market_potential[customer_id]` → `Dim_Cust[Customer]` (many-to-one)
- `fact_market_potential[terumo_category]` → `dim_terumo_category[terumo_category]` (many-to-one)
- `fact_market_potential[procedure_group]` → `dim_procedure[procedure_group]` (many-to-one)
- `fact_market_potential[customer_market_key]` → `dim_customer_market[customer_market_key]` (many-to-one)
- `Sales_Category[Terumo Category]` → `dim_terumo_category[terumo_category]` (many-to-one)
- `Sales_Category[Customer Id]` → `Dim_Cust[Customer]` (many-to-one)
- `DATA[Customer]` → `Dim_Cust[Customer]` (many-to-one, bi-directional)
- `DATA[Index_Branch_CountryFinalDestination]` → `Shp_Dim_Country_Hierarchy[Index_Branch_CountryFinalDestination]` (many-to-one)

### Measure inventory

All measures live on `fact_market_potential`. Display folders follow the `MS v2\` prefix. The C# script `potential_v2_measures.csx` creates/updates all measures below. Run it in Tabular Editor 2.28+ before building visuals.

#### 00 Helpers (hidden from report view)

| Measure | Purpose |
|---|---|
| `_Current Sales Year` | `MAX(Sales_Category[Year])` — dynamic year for realized data |
| `_Current Potential Year` | Max year from fact_market_potential as string — dynamic year for potential data |

#### 01 Core

| Measure | Format | Purpose |
|---|---|---|
| `Pot Total Potential Units` | #,##0 | Total addressable units (procedures × units/proc × usage × allocation) |
| `Pot Total Potential Units (Latest)` | #,##0 | Above, filtered to latest potential year dynamically |
| `Pot Total Procedures (dedup)` | #,##0 | Deduplicated procedure count |
| `Pot Realized Qty` | #,##0 | Units sold in current year (dynamic) |
| `Pot Realized Sales EUR` | €#,##0 | Revenue in current year (dynamic) |
| `Pot Realized Sales EUR (DNA total)` | €#,##0 | Revenue from legacy DATA table (for reconciliation) |
| `Pot Realization %` | 0.0% | Alias for MS Estimated Share % |
| `MS Estimated Share %` | 0.0% | Realized Qty ÷ Potential Units (Latest) |

#### 02 Benchmark

| Measure | Format | Purpose |
|---|---|---|
| `MS Benchmark Share %` | 0.0% | Cascading benchmark: Country+Segment → Country → Segment → National. Capped at 100%. |
| `MS Benchmark Level` | text | Which benchmark level was used (transparency label) |
| `MS National Realization Pct` | 0.0% | Share % at national level (all customers removed) |
| `MS Realization Index` | #,##0 | (Estimated Share ÷ Benchmark Share) × 100. Core performance metric. 100 = average peer. |

#### 02 Revenue

| Measure | Format | Purpose |
|---|---|---|
| `MS Category Revenue Share` | 0.0% | Category's realized EUR ÷ total realized EUR |
| `MS Customer Revenue Share` | 0.0% | Customer's realized EUR ÷ total realized EUR |
| `MS Category Revenue Rank` | #,##0 | Rank of category by realized EUR (dense, desc) |
| `MS Customer Revenue Rank` | #,##0 | Rank of customer by realized EUR (dense, desc) |
| `MS Revenue Concentration Top20` | 0.0% | Share of total revenue held by top 20% of customers |

#### 03 Value

| Measure | Format | Purpose |
|---|---|---|
| `Pot Avg Price EUR` | €#,##0.00 | Account ASP, falling back to national category ASP |
| `MS Avg Price by Category` | €#,##0.00 | National-level ASP per category |

#### 03 Customer Strength

| Measure | Format | Purpose |
|---|---|---|
| `MS Customer Category Mix` | 0.0% | Category share within this customer |
| `MS National Category Mix` | 0.0% | Category share at national level |
| `MS Mix Index` | #,##0 | (Customer Mix ÷ National Mix) × 100 |
| `MS Category Coverage` | 0.0% | Categories bought ÷ total categories |
| `MS Whitespace Count` | #,##0 | Categories not bought by this customer |

#### 04 Account Priority

| Measure | Format | Purpose |
|---|---|---|
| `MS Customer Strength Badge` | text | Champion / Above average / Below average / Growth target |
| `MS Customer Action Badge` | text | Protect / Maintain / Monitor / Grow |
| `MS Account Priority Score` | #,##0 | (Customer size rank) × Whitespace count |

#### 04 Opportunity

| Measure | Format | Purpose |
|---|---|---|
| `Pot Gap Units` | #,##0 | MAX(0, Targetable − Realized) |
| `Pot Gap EUR` | €#,##0 | Gap Units × Avg Price EUR per category |
| `Pot Potential Value EUR` | €#,##0 | Targetable Units × Avg Price EUR |
| `MS Targetable Units` | #,##0 | Potential × Benchmark Share |
| `MS Revenue Opportunity` | €#,##0 | Alias for Gap EUR |
| `MS Weighted Opportunity Score` | €#,##0 | Sum of Gap EUR across categories |
| `MS Category Priority Score` | #,##0 | GapEUR × ((150 − RI) ÷ 100) |
| `MS Revenue-Weighted Category Priority` | #,##0 | GapEUR × (1 − EstimatedShare%) — new |
| `MS Customer Potential Value EUR` | €#,##0 | Targetable × ASP per customer — new |
| `MS Gap as Pct of Potential` | 0.0% | Gap EUR ÷ Potential Value EUR — new |

#### 05 Target

| Measure | Format | Purpose |
|---|---|---|
| `MS Target RI Value` | #,##0 | Selected RI target from what-if slicer |
| `MS Target RI Label` | text | "Units to reach RI {value}" |
| `MS Units to Target` | #,##0 | Units needed to reach target RI |
| `MS Units to Reach RI 50` | #,##0 | Units needed to reach RI 50 |
| `MS Units to Reach RI 75` | #,##0 | Units needed to reach RI 75 |
| `MS Units to Reach RI 100` | #,##0 | Units needed to reach RI 100 |
| `MS Units to Reach RI 150` | #,##0 | Units needed to reach RI 150 |
| `MS Current vs Target Status` | text | Achieved / Near target / Halfway / Below target |
| `MS Action Flag` | text | Keep Protecting / Focus as Priority / Capture Potential / Optimise Contact |

#### 06 Category View (new)

| Measure | Format | Purpose |
|---|---|---|
| `MS Customer Priority in Category` | #,##0 | Composite: GapUnits × RevShare × (150−RI)/100 |
| `MS Customer Action in Category` | text | Priority Target / Growth Opportunity / Capture Remaining / Protect Position / Fully Penetrated |
| `MS Category Customer Count` | #,##0 | Distinct customers buying this category |
| `MS Category Whitespace Customers` | #,##0 | Customers in scope NOT buying this category |

#### 07 Executive (new)

| Measure | Format | Purpose |
|---|---|---|
| `MS Total Addressable Market EUR` | €#,##0 | Sum of Targetable × ASP across all customers × categories |
| `MS Portfolio Realization Pct` | 0.0% | Realized EUR ÷ TAM EUR |
| `MS Growth Target Account Count` | #,##0 | Accounts with RI < 50 |
| `MS Champion Account Count` | #,##0 | Accounts with RI ≥ 150 |
| `MS Total Gap EUR` | €#,##0 | Total gap across all customers × categories |

---

## Dashboard pages

### Page 1: Executive overview

**Purpose:** Single-glance portfolio health. "Are we winning or losing overall, and where should I look first?"

**No user questions here — this page gives verdicts.**

#### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  SLICERS (top bar):                                                  │
│  [Country Text]  [customer_segment]  [terumo_category]               │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Card     │ Card     │ Card     │ Card     │ Card     │ Card          │
│ Total    │ Realized │ Total    │ Portfolio │ Champion │ Growth Target │
│ Addressbl│ Sales EUR│ Gap EUR  │ Realizatn│ Accounts │ Accounts      │
│ Mkt EUR  │          │          │ %        │          │               │
├──────────┴──────────┴──────────┼──────────┴──────────┴───────────────┤
│ Clustered Bar Chart            │ Treemap                             │
│ X: terumo_category             │ Group: terumo_category              │
│ Y1: Pot Realized Sales EUR     │ Size: Pot Gap EUR                   │
│ Y2: Pot Gap EUR                │ Color: MS Realization Index         │
│ (stacked to show total         │ (saturation: low RI = dark/red,     │
│  addressable visually)         │  high RI = light/green)             │
│ Sort: desc by Y1+Y2            │                                     │
├────────────────────────────────┼─────────────────────────────────────┤
│ Scatter Chart                  │ Table                               │
│ X: Pot Realized Sales EUR      │ Cols: Country Text,                 │
│ Y: MS Realization Index        │       Pot Realized Sales EUR,       │
│ Size: Pot Gap EUR              │       MS Realization Index,         │
│ Detail: Country Text           │       Pot Gap EUR,                  │
│ Reference line: RI=100         │       MS Growth Target Account Cnt, │
│                                │       MS Champion Account Count     │
│                                │ Sort: Pot Gap EUR desc              │
└────────────────────────────────┴─────────────────────────────────────┘
```

#### Interactions
- All visuals cross-filter each other.
- Clicking a bar in the category chart filters the scatter and table to that category's customer/country breakdown.
- No drill-through from this page — it's an orientation layer.

---

### Page 2: Where to go — Products

**Purpose:** "Which product categories should we prioritize for growth?" Answers with revenue, not just volume.

#### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  SLICERS (top bar):                                                  │
│  [Country Text]  [procedure_group]  [terumo_category]                │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Card     │ Card     │ Card     │ Card     │ Card     │ Card          │
│ Pot Real │ Pot Real │ Pot Total│ Pot Gap  │ Pot Gap  │ Pot Potentl   │
│ Sales EUR│ ized Qty │ Potl Unt │ Units    │ EUR      │ Value EUR     │
├──────────┴──────────┴──────────┴──────────┴──────────┴───────────────┤
│ === PRIMARY VISUAL: Revenue Opportunity Matrix ===                    │
│ Clustered Bar Chart (horizontal)                                     │
│ Axis: terumo_category                                                │
│ Values:                                                              │
│   Bar 1: Pot Realized Sales EUR (blue, solid)                        │
│   Bar 2: Pot Gap EUR (amber, striped/lighter)                        │
│ Sort: desc by (Realized + Gap = Potential Value)                     │
│ Data labels: on Bar 2 only (gap EUR)                                 │
│ Tooltip: MS Realization Index, MS Category Revenue Share,            │
│          MS Avg Price by Category, MS Category Revenue Rank          │
├──────────────────────────────┬───────────────────────────────────────┤
│ Bar Chart                    │ Bar Chart                             │
│ Axis: terumo_category        │ Axis: terumo_category                │
│ Value: MS Category Revenue   │ Value: MS Realization Index           │
│        Share                 │ Reference line at 100                 │
│ Sort: desc                   │ Conditional color:                    │
│                              │   <50 red, 50-99 amber, ≥100 green   │
├──────────────────────────────┴───────────────────────────────────────┤
│ Table (bottom detail)                                                │
│ Columns:                                                             │
│   terumo_category                                                    │
│   Pot Realized Sales EUR                                             │
│   MS Category Revenue Share                                          │
│   Pot Realized Qty                                                   │
│   Pot Total Potential Units                                          │
│   MS Estimated Share %                                               │
│   MS Realization Index                                               │
│   Pot Gap EUR                                                        │
│   MS Revenue-Weighted Category Priority                              │
│   MS Action Flag                                                     │
│ Sort: MS Revenue-Weighted Category Priority desc                     │
│ Conditional formatting:                                              │
│   MS Realization Index: background color scale (red→amber→green)     │
│   MS Action Flag: icon set or background color per value             │
└──────────────────────────────────────────────────────────────────────┘
```

#### Key difference from v1
- v1 had no revenue cards and led with Realization % (a unit ratio). v2 leads with Realized Sales EUR and Gap EUR.
- v1 table had no Action Flag or revenue-weighted priority. v2 sorts by `MS Revenue-Weighted Category Priority` so the most valuable growth categories surface first.
- Pot Potential Value EUR card added (was built but never surfaced).

---

### Page 3: Where to go — Customers

**Purpose:** "Which customer accounts should we invest in for the biggest revenue return?"

#### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  SLICERS (top bar):                                                  │
│  [Country Text]  [customer_segment]  [terumo_category]               │
├──────────┬──────────┬──────────┬──────────────────────────────────────┤
│ Card     │ Card     │ Card     │ Card                                 │
│ Pot Real │ Pot Real │ MS Natnl │ MS Revenue Concentration Top20       │
│ Sales EUR│ ized Qty │ Realztn% │                                      │
├──────────┴──────────┴──────────┴──────────────────────────────────────┤
│ === PRIMARY VISUAL: Customer Opportunity Scatter ===                  │
│ Scatter Chart                                                        │
│ X axis: Pot Realized Sales EUR (log scale recommended)               │
│ Y axis: MS Realization Index                                         │
│ Size: MS Weighted Opportunity Score (Pot Gap EUR)                     │
│ Legend: MS Customer Action Badge (color by Protect/Maintain/          │
│         Monitor/Grow)                                                │
│ Detail: Dim_Cust[Customer Name]                                      │
│ Reference lines:                                                     │
│   Horizontal at RI = 100 (label: "Peer average")                     │
│   Horizontal at RI = 50 (label: "Growth threshold", dashed)          │
│ Tooltip: MS Category Coverage, MS Whitespace Count,                  │
│          MS Customer Revenue Rank, MS Customer Strength Badge        │
│                                                                      │
│ QUADRANT INTERPRETATION (add as text box or annotation):             │
│   Top-right: High revenue, high RI → PROTECT                        │
│   Bottom-right: High revenue, low RI → URGENT — capture gap          │
│   Top-left: Low revenue, high RI → MAINTAIN — small but loyal        │
│   Bottom-left: Low revenue, low RI → GROW if strategic               │
├──────────────────────────────────────────────────────────────────────┤
│ Table (bottom detail)                                                │
│ Columns:                                                             │
│   Customer Name                                                      │
│   Pot Realized Sales EUR                                             │
│   MS Customer Revenue Share                                          │
│   Pot Realized Qty                                                   │
│   MS Realization Index                                               │
│   MS Category Coverage                                               │
│   MS Whitespace Count                                                │
│   Pot Gap EUR (renamed display: "Revenue Opportunity")               │
│   MS Account Priority Score                                          │
│   MS Customer Action Badge                                           │
│ Sort: Pot Gap EUR desc                                               │
│ Conditional formatting:                                              │
│   MS Realization Index: background scale (red→amber→green)           │
│   MS Customer Action Badge: background color per badge value         │
│ Drillthrough: → Page 5 (How to win — In this account)               │
└──────────────────────────────────────────────────────────────────────┘
```

#### Key difference from v1
- v1 scatter used Realized Qty on X and Category Coverage on Y. v2 uses Realized Sales EUR on X and RI on Y — directly showing revenue importance vs. performance gap.
- v1 table had Pot Gap Units. v2 replaces with Pot Gap EUR and adds MS Customer Revenue Share.
- New card: Revenue Concentration Top20 — communicates portfolio risk.
- Drillthrough to "In this account" page enabled.

---

### Page 4: How to win — In this category (NEW)

**Purpose:** "I've identified a category to grow. Which specific accounts should I target?"

This page did not exist in v1. It is the reverse of "In this account."

#### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  SLICERS (top bar):                                                  │
│  [Country Text]  [customer_segment]                                  │
│  [terumo_category] ← SINGLE SELECT, REQUIRED — this drives the page │
├──────────┬──────────┬──────────┬──────────┬──────────────────────────┤
│ Card     │ Card     │ Card     │ Card     │ Card                     │
│ Pot Real │ MS Cat   │ MS Cat   │ MS Cat   │ MS Realiztn              │
│ Sales EUR│ Revenue  │ Customer │ Whitespce│ Index                    │
│          │ Share    │ Count    │ Customers│                          │
├──────────┴──────────┴──────────┴──────────┴──────────────────────────┤
│ === PRIMARY VISUAL: Customer waterfall/ranked bar ===                 │
│ Clustered Bar Chart (horizontal)                                     │
│ Axis: Customer Name                                                  │
│ Values:                                                              │
│   Bar 1: Pot Realized Qty (blue)                                     │
│   Bar 2: Pot Gap Units (amber, lighter)                              │
│ Top N filter: Top 20 by Pot Gap Units                                │
│ Sort: Pot Gap Units desc                                             │
│ Tooltip: MS Realization Index, MS Customer Action in Category,       │
│          Pot Gap EUR                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ Table (detail)                                                       │
│ Columns:                                                             │
│   Customer Name                                                      │
│   customer_segment (from fact_market_potential)                       │
│   Country Text                                                       │
│   Pot Realized Qty                                                   │
│   Pot Realized Sales EUR                                             │
│   MS Realization Index                                               │
│   Pot Gap Units                                                      │
│   Pot Gap EUR                                                        │
│   MS Customer Priority in Category                                   │
│   MS Customer Action in Category                                     │
│ Sort: MS Customer Priority in Category desc                          │
│ Conditional formatting:                                              │
│   MS Realization Index: background scale (red→amber→green)           │
│   MS Customer Action in Category: icon or background per value       │
│ Drillthrough: → Page 5 (How to win — In this account)               │
└──────────────────────────────────────────────────────────────────────┘
```

#### Interaction notes
- The `terumo_category` slicer should be configured as single-select with "Select all" disabled. This page only makes sense in the context of one category.
- The bar chart shows top 20 gap accounts. Clicking a bar cross-filters the table.
- `MS Customer Priority in Category` is the compound score: Gap × Revenue share × (150−RI)/100. It surfaces accounts where the gap is large, the account matters (revenue share), and current penetration is low.

---

### Page 5: How to win — In this account

**Purpose:** "I'm going into this account. Which categories should I push, and how far can I go?"

#### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  SLICERS (top bar):                                                  │
│  [Country Text]  [customer_segment]  [terumo_category]               │
│  [Customer Name] ← SINGLE SELECT, REQUIRED — drives the page        │
│  [Target RI Value] ← What-if slider (default 100)                   │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Card     │ Card     │ Card     │ Card     │ Card     │ Card          │
│ Pot Real │ Pot Real │ MS Real  │ MS Cust  │ MS Cat   │ MS Whitespace │
│ Sales EUR│ ized Qty │ Index    │ Strength │ Coverage │ Count         │
│          │          │          │ Badge    │          │               │
├──────────┴──────────┼──────────┴──────────┴──────────┴───────────────┤
│ Bar Chart (horiz)   │ Table: Category mix analysis                   │
│ Axis: terumo_cat    │ Columns:                                       │
│ Value: MS Realztn   │   terumo_category                              │
│        Index        │   MS Customer Category Mix                     │
│ Reference: 100      │   MS National Category Mix                     │
│ Cond color by RI    │   MS Mix Index                                 │
│                     │   MS Realization Index                          │
│                     │   MS Customer Action Badge                     │
│                     │   MS Benchmark Level                            │
│                     │ Sort: MS Mix Index desc                        │
│                     │ Cond fmt: RI + Mix Index scales                │
├─────────────────────┴────────────────────────────────────────────────┤
│ === GROWTH TARGETS SECTION ===                                       │
│ Title text: MS Target RI Label (dynamic: "Units to reach RI {X}")   │
├──────────┬──────────┬──────────┬──────────────────────────────────────┤
│ Card     │ Card     │ Card     │ Card                                 │
│ Units to │ Units to │ Units to │ Units to                             │
│ RI 50    │ RI 75    │ RI 100   │ RI 150                               │
├──────────┴──────────┴──────────┴──────────────────────────────────────┤
│ Stacked Bar Chart                                                    │
│ Axis: terumo_category                                                │
│ Values:                                                              │
│   Pot Realized Qty (blue, "Current")                                 │
│   MS Units to Target (amber, "Gap to target")                        │
│ Sort: MS Units to Target desc                                        │
│ Tooltip: MS Current vs Target Status, MS Realization Index           │
├──────────────────────────────────────────────────────────────────────┤
│ Table: category-level targets                                        │
│ Columns:                                                             │
│   terumo_category                                                    │
│   Pot Realized Qty                                                   │
│   Pot Total Potential Units                                          │
│   MS Realization Index                                               │
│   MS Units to Target                                                 │
│   MS Current vs Target Status                                        │
│   Pot Gap EUR                                                        │
│   MS Action Flag                                                     │
│ Sort: MS Units to Target desc                                        │
│ Cond fmt: MS Current vs Target Status background color               │
└──────────────────────────────────────────────────────────────────────┘
```

#### Interaction notes
- `Customer Name` slicer is single-select. This is an account-level deep dive.
- `Target RI` what-if slicer updates all "Units to reach RI {X}" measures dynamically.
- The RI bar chart and mix table cross-filter to let the user focus on one category within the account.
- `MS Benchmark Level` in the mix table is critical transparency — the user can see whether the benchmark is country+segment or a broader fallback.
- `MS Action Flag` provides the final verdict per category: Focus as Priority / Capture Potential / Keep Protecting / Optimise Contact.

---

## Cross-page navigation

| From page | To page | Mechanism | Filter passed |
|---|---|---|---|
| Page 1 (Executive) | Page 2 (Products) | Button or visual header click | Country Text (if filtered) |
| Page 1 (Executive) | Page 3 (Customers) | Button or visual header click | Country Text (if filtered) |
| Page 2 (Products) | Page 4 (In this category) | Drillthrough on category bar/row | terumo_category |
| Page 3 (Customers) | Page 5 (In this account) | Drillthrough on customer row | Customer Name |
| Page 4 (In this category) | Page 5 (In this account) | Drillthrough on customer row | Customer Name, terumo_category |

Drillthrough should pass all active slicer context (country, segment) automatically.

---

## Conditional formatting rules

Apply consistently across all pages:

### MS Realization Index (background color scale)

| RI range | Background | Text |
|---|---|---|
| < 50 | Light red (#FCEBEB) | Dark red (#791F1F) |
| 50–79 | Light amber (#FAEEDA) | Dark amber (#633806) |
| 80–99 | Light yellow (#FFF8E1) | Dark amber (#633806) |
| 100–149 | Light green (#EAF3DE) | Dark green (#27500A) |
| ≥ 150 | Green (#C0DD97) | Dark green (#173404) |

### MS Action Flag / MS Customer Action Badge / MS Customer Action in Category

| Value | Background | Text |
|---|---|---|
| Focus as Priority / Priority Target / Grow | Light red (#FCEBEB) | #791F1F |
| Capture Potential / Growth Opportunity / Monitor | Light amber (#FAEEDA) | #633806 |
| Optimise Contact / Capture Remaining / Maintain | Light blue (#E6F1FB) | #0C447C |
| Keep Protecting / Protect Position / Protect / Fully Penetrated | Light green (#EAF3DE) | #27500A |

### MS Current vs Target Status

| Value | Background |
|---|---|
| Below target | Light red |
| Halfway | Light amber |
| Near target | Light yellow |
| Achieved | Light green |

---

## Slicer configuration

| Slicer | Type | Sync across pages | Default |
|---|---|---|---|
| Country Text | Dropdown, multi-select | Pages 1–5 | All |
| customer_segment | Dropdown, multi-select | Pages 1, 3, 4, 5 | All |
| terumo_category | Dropdown, multi-select on pages 1–3; **single-select on page 4** | Pages 1–4 | All (except page 4: first value) |
| Customer Name | Dropdown, single-select | Pages 3, 5 | (none) on page 3; required on page 5 |
| procedure_group | Dropdown, multi-select | Page 2 only | All |
| Target RI Value | Numeric slider | Page 5 only | 100 |

---

## Tooltip configuration

All visuals should use custom tooltips showing contextual measures beyond what's on the visual axes. Key tooltip fields per visual type:

- **Category bar charts**: MS Realization Index, MS Category Revenue Share, Pot Gap EUR, MS Action Flag
- **Customer scatter/table**: MS Customer Strength Badge, MS Category Coverage, MS Whitespace Count, MS Benchmark Level
- **Growth target bars**: MS Current vs Target Status, MS Realization Index, Pot Gap EUR

---

## Theme and formatting

### Report theme

- Font family: Segoe UI
- Primary color: #185FA5 (blue-600 from palette)
- Secondary color: #1D9E75 (teal-400)
- Accent: #BA7517 (amber-400)
- Background: #FFFFFF
- Card backgrounds: #F8F7F5

### Number formatting

| Type | Format |
|---|---|
| Currency (EUR) | €#,##0 (no decimals for large values) |
| Units | #,##0 |
| Percentages | 0.0% |
| Index values | #,##0 (no decimals, no % sign) |
| Rank | #,##0 |

### Card visual formatting

- Title: 10pt, secondary text color
- Value: 24pt, bold, primary text color
- All cards should show the measure name as subtitle, not rely on visual title only

---

## Validation checklist

Before deploying, verify:

1. **Dynamic year**: `_Current Sales Year` returns the correct year. `Pot Total Potential Units (Latest)` matches the value previously shown by `Pot Total Potential Units (2024)`.
2. **Revenue reconciliation**: Compare `Pot Realized Sales EUR` (from Sales_Category) against `Pot Realized Sales EUR (DNA total)` (from DATA) at country level. Document any discrepancies — they arise from different join paths and filters.
3. **Benchmark cascade**: For a customer in a well-populated country+segment, verify `MS Benchmark Level` = "Country + Segment". For a customer in a sparse segment, verify it falls back to "Country" or "Segment".
4. **RI reasonableness**: No RI values above ~500 (would indicate allocation_weight issue). Spot-check a few accounts manually: Realized Qty ÷ Potential Units × 100 ÷ Benchmark Share × 100 should match MS Realization Index.
5. **Cross-page drillthrough**: Drilling from Page 3 → Page 5 should carry the customer filter. Drilling from Page 4 → Page 5 should carry both customer and category.
6. **Slicer sync**: Changing Country Text on Page 1 should persist when navigating to Page 2.
7. **Edge cases**: What happens when a customer has zero realized qty? RI should be 0, not blank. What about a category with zero potential? These should not appear in tables (add visual-level filter: `Pot Total Potential Units > 0`).

---

## Files in this package

| File | Purpose |
|---|---|
| `potential_v2_measures.csx` | Tabular Editor 2.x C# script — run first to create/update all DAX measures |
| `potential.bim` | Source Tabular model (input — do not modify directly, use the script) |
| `LIVE_BINDING_INVENTORY.csv` | v1 dashboard visual bindings (reference only — shows what existed before) |
| `DASHBOARD_SPEC.md` | This file — complete build specification for v2 |

---

## Appendix A: Measures built but intentionally excluded from v2 dashboard

| Measure | Reason for exclusion |
|---|---|
| `MS Revenue Opportunity` | Identical to `Pot Gap EUR` — use Gap EUR directly |
| `Pot Realized Sales EUR (DNA total)` | Legacy reconciliation only — not for user-facing visuals |
| `_Current Sales Year` | Helper, hidden from report view |
| `_Current Potential Year` | Helper, hidden from report view |
| Gauge measures (DATA table) | Legacy gauges, not part of potential framework |

## Appendix B: Known limitations

1. **Year hardcoding**: Fixed by this script, but if the Sales_Category or fact_market_potential tables are refreshed with a new year's data, the dynamic year measures will automatically pick up the latest year. No manual change needed.
2. **Benchmark cap at 100%**: `MS Benchmark Share %` uses `MIN(1, ChosenRate)`. In segments where aggregate realization exceeds 100% (e.g., disposable-heavy categories with high usage rates), individual account RIs will be deflated. This is by design — it prevents target inflation — but should be documented for users.
3. **Allocation weight integrity**: The potential calculation depends on `allocation_weight` summing to 1.0 per customer-procedure-category group. If upstream data changes this constraint, potential figures will be incorrect.
4. **Sales_Category vs DATA divergence**: Sales_Category is built via Power Query from DATA + product mapping. Any changes to the mapping table or DATA source will require Sales_Category to be re-evaluated. The two sources may diverge at the margin level due to different join paths.
5. **No RLS on potential tables**: The existing Row-Level Security roles apply to DATA and related tables. fact_market_potential and Sales_Category currently bypass RLS. If per-user filtering is required on the potential pages, additional security roles must be created joining through Dim_Cust → Shp_Dim_Country_Hierarchy → security tables.
