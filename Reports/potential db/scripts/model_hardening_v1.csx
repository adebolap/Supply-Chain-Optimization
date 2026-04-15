// model_hardening_v1.csx
// Market Potential Dashboard — Model Hardening v1
// Run in Tabular Editor 2.28+ against PotentialMarket.SemanticModel/model.bim
//
// What this script does:
//   1. Adds Dim_Cust[Benchmark Segment] calculated column (sourced from potential grain)
//   2. Rewrites 6 measures to use Benchmark Segment and monetizable-opportunity logic
//   3. Adds MS Benchmark Quality Weight (new)
//   4. Changes 6 bidirectional relationships to single-direction
//
// After running: Ctrl+S to save, then open in Power BI Desktop.

var factTable = Model.Tables["fact_market_potential"];
var dimCust   = Model.Tables["Dim_Cust"];

if (factTable == null) { Error("Table 'fact_market_potential' not found. Aborting."); return; }
if (dimCust   == null) { Error("Table 'Dim_Cust' not found. Aborting."); return; }

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: upsert a measure (create or overwrite)
// ─────────────────────────────────────────────────────────────────────────────
void UpsertMeasure(Table tbl, string name, string expr,
                   string folder = "", string fmt = "", string desc = "")
{
    Measure m;
    if (tbl.Measures[name] == null)
    {
        m = tbl.AddMeasure(name, expr, folder);
        Info("+ Created  : " + name);
    }
    else
    {
        m = tbl.Measures[name];
        m.Expression    = expr;
        if (!string.IsNullOrEmpty(folder)) m.DisplayFolder = folder;
        Info("~ Updated  : " + name);
    }
    if (!string.IsNullOrEmpty(fmt))  m.FormatString  = fmt;
    if (!string.IsNullOrEmpty(desc)) m.Description   = desc;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Dim_Cust[Benchmark Segment] calculated column
// Sources segment from potential grain, not from legacy TIS segmentation tables.
// MINX is safe if a customer appears in multiple rows with the same segment;
// returns alphabetically first if they differ (deterministic, won't error).
// ─────────────────────────────────────────────────────────────────────────────
{
    var colName = "Benchmark Segment";
    var colExpr = @"MINX (
    FILTER (
        ALL ( fact_market_potential ),
        fact_market_potential[customer_id] = Dim_Cust[Customer]
    ),
    fact_market_potential[customer_segment]
)";
    CalculatedColumn col;
    if (dimCust.Columns[colName] == null)
    {
        col = dimCust.AddCalculatedColumn(colName, colExpr);
        Info("+ Created  : Dim_Cust[Benchmark Segment]");
    }
    else
    {
        col = (CalculatedColumn)dimCust.Columns[colName];
        col.Expression = colExpr;
        Info("~ Updated  : Dim_Cust[Benchmark Segment]");
    }
    col.DisplayFolder = "Segmentation";
    col.Description   = "Canonical segment sourced from potential grain. " +
                        "Replaces TIS Final Segmenation for all benchmark calculations.";
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — MS Benchmark Share %
// Was: keyed off Dim_Cust[TIS Final Segmenation]
// Now: keyed off Dim_Cust[Benchmark Segment] (same grain as page-level filters)
// ─────────────────────────────────────────────────────────────────────────────
UpsertMeasure(factTable,
    "MS Benchmark Share %",
    @"VAR CountrySegmentRate =
    CALCULATE (
        [MS Estimated Share %],
        ALLEXCEPT (
            Dim_Cust,
            Dim_Cust[Country Text],
            Dim_Cust[Benchmark Segment]
        )
    )
VAR CountryRate =
    CALCULATE (
        [MS Estimated Share %],
        ALLEXCEPT (
            Dim_Cust,
            Dim_Cust[Country Text]
        )
    )
VAR SegmentRate =
    CALCULATE (
        [MS Estimated Share %],
        ALLEXCEPT (
            Dim_Cust,
            Dim_Cust[Benchmark Segment]
        )
    )
VAR NationalRate =
    CALCULATE (
        [MS Estimated Share %],
        REMOVEFILTERS ( Dim_Cust )
    )
VAR ChosenRate =
    COALESCE ( CountrySegmentRate, CountryRate, SegmentRate, NationalRate )
RETURN
    MIN ( 1, ChosenRate )",
    "MS v2\\Benchmark", "0.0%",
    "Benchmark share rate. Cascades Country+Segment → Country → Segment → National. " +
    "Uses Benchmark Segment from potential grain.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — MS Benchmark Level
// Same rewrite: TIS Final Segmenation → Benchmark Segment
// ─────────────────────────────────────────────────────────────────────────────
UpsertMeasure(factTable,
    "MS Benchmark Level",
    @"VAR CountrySegmentRate =
    CALCULATE (
        [MS Estimated Share %],
        ALLEXCEPT (
            Dim_Cust,
            Dim_Cust[Country Text],
            Dim_Cust[Benchmark Segment]
        )
    )
VAR CountryRate =
    CALCULATE (
        [MS Estimated Share %],
        ALLEXCEPT (
            Dim_Cust,
            Dim_Cust[Country Text]
        )
    )
VAR SegmentRate =
    CALCULATE (
        [MS Estimated Share %],
        ALLEXCEPT (
            Dim_Cust,
            Dim_Cust[Benchmark Segment]
        )
    )
RETURN
    SWITCH (
        TRUE (),
        NOT ISBLANK ( CountrySegmentRate ), ""Country + Segment"",
        NOT ISBLANK ( CountryRate ),        ""Country"",
        NOT ISBLANK ( SegmentRate ),        ""Segment"",
        ""National""
    )",
    "MS v2\\Benchmark", "",
    "Diagnostic: shows which benchmark cohort was used for this customer. " +
    "Expose in tooltips so users understand benchmark confidence.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — MS Customer Revenue Share
// Was: REMOVEFILTERS(Dim_Cust) — denominator was all visible customers
// Now: keeps Country + Category slice, removes only individual customer
//      → share within the same country/category rather than global
// ─────────────────────────────────────────────────────────────────────────────
UpsertMeasure(factTable,
    "MS Customer Revenue Share",
    @"DIVIDE (
    [Pot Realized Sales EUR],
    CALCULATE (
        [Pot Realized Sales EUR],
        REMOVEFILTERS ( Dim_Cust[Customer] ),
        VALUES ( Dim_Cust[Country Text] ),
        VALUES ( dim_terumo_category[terumo_category] )
    )
)",
    "MS v2\\Revenue", "0.0%",
    "Customer share of realized revenue within the same country + category slice. " +
    "Denominator no longer includes all countries when a country filter is active.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — MS Account Priority Score
// Was: RANKX-based size score × whitespace count → large accounts always win
// Now: revenue gap × RI shortfall × benchmark confidence × revenue floor
//      → scores are commercial (bigger monetizable gap = higher priority)
// ─────────────────────────────────────────────────────────────────────────────
UpsertMeasure(factTable,
    "MS Account Priority Score",
    @"VAR GapEUR = [Pot Gap EUR]
VAR RI = [MS Realization Index]
VAR RIShortfallFactor =
    DIVIDE ( MAX ( 0, 120 - COALESCE ( RI, 0 ) ), 100, 0 )
VAR BenchmarkWeight =
    SWITCH (
        [MS Benchmark Level],
        ""Country + Segment"", 1.00,
        ""Country"",           0.90,
        ""Segment"",           0.80,
        0.65
    )
VAR RealizedRevenueFloor =
    IF ( [Pot Realized Sales EUR] >= 10000, 1, 0.85 )
RETURN
    IF (
        ISBLANK ( GapEUR ) || GapEUR <= 0,
        0,
        ROUND (
            GapEUR
                * MAX ( 0.25, RIShortfallFactor )
                * BenchmarkWeight
                * RealizedRevenueFloor,
            0
        )
    )",
    "MS v2\\Priority", "#,0",
    "Revenue-opportunity-led account priority. " +
    "Larger EUR gap + lower RI + stronger benchmark = higher score. " +
    "Small/new accounts discounted 15% via RealizedRevenueFloor.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — MS Customer Priority in Category
// Was: gap units × revenue share × RI shortfall (unit-based, not EUR-based)
// Now: gap EUR × RI shortfall × revenue importance (monetizable opportunity)
// ─────────────────────────────────────────────────────────────────────────────
UpsertMeasure(factTable,
    "MS Customer Priority in Category",
    @"VAR GapEUR = [Pot Gap EUR]
VAR RI = [MS Realization Index]
VAR RIShortfallFactor =
    DIVIDE ( MAX ( 0, 130 - COALESCE ( RI, 0 ) ), 100, 0 )
VAR RevenueImportance =
    MAX ( 0.05, COALESCE ( [MS Customer Revenue Share], 0 ) )
RETURN
    IF (
        ISBLANK ( GapEUR ) || GapEUR <= 0,
        0,
        ROUND (
            GapEUR
                * MAX ( 0.25, RIShortfallFactor )
                * RevenueImportance,
            0
        )
    )",
    "MS v2\\Priority", "#,0",
    "Category-level customer priority. " +
    "Floor of 5% revenue importance prevents zero-revenue accounts from scoring 0. " +
    "RI shortfall threshold raised to 130 vs account-level 120.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — MS Total Addressable Market EUR
// Was: CROSSJOIN(VALUES(customers), VALUES(categories)) — can overstate
// Now: SUMMARIZE(fact) — anchored to rows that actually exist in the data
// ─────────────────────────────────────────────────────────────────────────────
UpsertMeasure(factTable,
    "MS Total Addressable Market EUR",
    @"SUMX (
    SUMMARIZE (
        fact_market_potential,
        fact_market_potential[customer_id],
        fact_market_potential[terumo_category]
    ),
    [MS Targetable Units] * [Pot Avg Price EUR]
)",
    "MS v2\\Market", "€#,0;;",
    "TAM anchored to existing potential rows only. " +
    "Replaces CROSSJOIN version which could overstate by including " +
    "customer-category combinations that never existed in the data.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8 — MS Benchmark Quality Weight (NEW)
// Numeric version of MS Benchmark Level — use in tooltips and visual encodings
// ─────────────────────────────────────────────────────────────────────────────
UpsertMeasure(factTable,
    "MS Benchmark Quality Weight",
    @"SWITCH (
    [MS Benchmark Level],
    ""Country + Segment"", 1.00,
    ""Country"",           0.90,
    ""Segment"",           0.80,
    0.65
)",
    "MS v2\\Benchmark", "0.00",
    "Numeric benchmark confidence weight (1.00 = Country+Segment, 0.65 = National). " +
    "Use as a tooltip field or in priority measure weighting.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 9 — Fix bidirectional relationships
// These 6 relationships should not propagate filters in both directions
// for the market potential pages. Setting to OneDirection reduces ambiguity.
// ─────────────────────────────────────────────────────────────────────────────
var biDirTargets = new (string fromTable, string fromCol, string toTable, string toCol)[]
{
    ( "DATA",               "Customer",           "Dim_Cust",  "Customer"          ),
    ( "Data_SA",            "SalesAssignmentID",  "Bridge_SA", "SalesAssignmentID" ),
    ( "Segmentation PI",    "SAP Nb",             "Dim_Cust",  "Customer"          ),
    ( "Segmentation IO",    "SAP Nb",             "Dim_Cust",  "Customer"          ),
    ( "Segmentation Cardio","SAP Nb",             "Dim_Cust",  "Customer"          ),
    ( "Period",             "Date",               "Dim_Cal",   "Date"              ),
};

int fixedCount = 0;
foreach (var rel in Model.Relationships)
{
    var r = rel as SingleColumnRelationship;
    if (r == null) continue;
    if (r.CrossFilteringBehavior != CrossFilteringBehavior.BothDirections) continue;

    foreach (var t in biDirTargets)
    {
        if (r.FromTable.Name == t.fromTable && r.FromColumn.Name == t.fromCol
         && r.ToTable.Name   == t.toTable   && r.ToColumn.Name   == t.toCol)
        {
            r.CrossFilteringBehavior = CrossFilteringBehavior.OneDirection;
            Info("-> Fixed bidir: " + t.fromTable + "[" + t.fromCol + "] -> "
                                    + t.toTable   + "[" + t.toCol   + "]");
            fixedCount++;
            break;
        }
    }
}

if (fixedCount == 0)
    Info("No bidirectional relationships matched — they may already be single-direction.");
else
    Info("Bidirectional relationships fixed: " + fixedCount + " / " + biDirTargets.Length);

// ─────────────────────────────────────────────────────────────────────────────
Info("");
Info("=== Model Hardening v1 complete ===");
Info("Created/updated 8 measures + 1 calculated column.");
Info("Ctrl+S to save the model.");
Info("Validate against known accounts before connecting the report.");
