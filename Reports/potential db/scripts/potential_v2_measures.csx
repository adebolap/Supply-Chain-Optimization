// ============================================================================
// potential_v2_measures.csx
// Tabular Editor 2.x C# Script — Market Potential Dashboard v2
// Run in: Tabular Editor 2.28+ against the "potential" model
// 
// What this script does:
//   1. Fixes hardcoded year filters with dynamic fiscal year logic
//   2. Adds new revenue-weighted prioritisation measures
//   3. Adds "How to win — In this category" supporting measures
//   4. Reorganises display folders for the new 5-page dashboard
// ============================================================================

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
var factTable   = "fact_market_potential";
var measTable   = "Measurement Collections";
var calTable    = "Dim_Cal";
var catTable    = "dim_terumo_category";
var custTable   = "Dim_Cust";
var salesCatTbl = "Sales_Category";
var dataTable   = "DATA";

// Display folder prefix for all new/modified measures
var folderRoot  = "MS v2";

// ─── HELPER: Create or update a measure ─────────────────────────────────────
// If the measure already exists on the target table, update its expression,
// folder, and format string. Otherwise, create it fresh.

Action<string, string, string, string, string> UpsertMeasure = (table, name, dax, folder, fmt) => {
    var t = Model.Tables[table];
    Measure m;
    if (t.Measures.Contains(name)) {
        m = t.Measures[name];
    } else {
        m = t.AddMeasure(name);
    }
    m.Expression = dax;
    m.DisplayFolder = folder;
    if (!string.IsNullOrEmpty(fmt)) m.FormatString = fmt;
};


// ============================================================================
// SECTION 1 — DYNAMIC YEAR HELPERS
// Replaces hardcoded Year = 2025 / year = "2024" with dynamic logic
// ============================================================================

// Helper: Current reporting year (based on Sales_Category max year)
UpsertMeasure(factTable, "_Current Sales Year",
@"
MAX ( Sales_Category[Year] )
",
    folderRoot + "\\00 Helpers", "0");

// Helper: Current potential year (string, from fact_market_potential)
UpsertMeasure(factTable, "_Current Potential Year",
@"
VAR MaxYearInt =
    MAXX ( ALL ( fact_market_potential[year] ), VALUE ( fact_market_potential[year] ) )
RETURN
    FORMAT ( MaxYearInt, ""0"" )
",
    folderRoot + "\\00 Helpers", "");

// ============================================================================
// SECTION 2 — FIX EXISTING MEASURES (dynamic year)
// ============================================================================

// Fix: Pot Realized Qty — was KEEPFILTERS(Year = 2025)
UpsertMeasure(factTable, "Pot Realized Qty",
@"
VAR CurrentYear = [_Current Sales Year]
RETURN
    CALCULATE (
        SUM ( Sales_Category[Qty Sold] ),
        KEEPFILTERS ( Sales_Category[Year] = CurrentYear )
    )
",
    folderRoot + "\\01 Core", "#,##0");

// Fix: Pot Realized Sales EUR — was KEEPFILTERS(Year = 2025)
UpsertMeasure(factTable, "Pot Realized Sales EUR",
@"
VAR CurrentYear = [_Current Sales Year]
RETURN
    CALCULATE (
        SUM ( Sales_Category[Sales EUR] ),
        KEEPFILTERS ( Sales_Category[Year] = CurrentYear )
    )
",
    folderRoot + "\\01 Core", "#,##0");

// Fix: Pot Total Potential Units (2024) — was hardcoded string ""2024""
// Renamed to "Pot Total Potential Units (Latest)" for clarity
UpsertMeasure(factTable, "Pot Total Potential Units (Latest)",
@"
VAR LatestYear = [_Current Potential Year]
RETURN
    CALCULATE (
        [Pot Total Potential Units],
        KEEPFILTERS ( fact_market_potential[year] = LatestYear )
    )
",
    folderRoot + "\\01 Core", "#,##0");

// Patch: MS Estimated Share % to use dynamic version
UpsertMeasure(factTable, "MS Estimated Share %",
@"
DIVIDE ( [Pot Realized Qty], [Pot Total Potential Units (Latest)] )
",
    folderRoot + "\\01 Core", "0.0%");

// Patch: MS Targetable Units to use dynamic version
UpsertMeasure(factTable, "MS Targetable Units",
@"
[Pot Total Potential Units (Latest)] * [MS Benchmark Share %]
",
    folderRoot + "\\04 Opportunity", "#,##0");

// Patch: MS Units to Target to use dynamic version
UpsertMeasure(factTable, "MS Units to Target",
@"
VAR TargetRI =
    DIVIDE ( [MS Target RI Value], 100, 1 )
VAR TargetRate =
    [MS Benchmark Share %] * TargetRI
VAR RequiredUnits =
    [Pot Total Potential Units (Latest)] * TargetRate
RETURN
    MAX ( 0, ROUND ( RequiredUnits - [Pot Realized Qty], 0 ) )
",
    folderRoot + "\\05 Target", "#,##0");

// Patch: MS Units to Reach RI 50/75/100/150 — all use dynamic potential
string[] riLevels = { "50", "75", "100", "150" };
double[] riFactors = { 0.50, 0.75, 1.00, 1.50 };

for (int i = 0; i < riLevels.Length; i++) {
    UpsertMeasure(factTable, "MS Units to Reach RI " + riLevels[i],
        string.Format(@"
VAR TargetRate =
    [MS Benchmark Share %] * {0}
VAR RequiredUnits =
    [Pot Total Potential Units (Latest)] * TargetRate
RETURN
    MAX ( 0, ROUND ( RequiredUnits - [Pot Realized Qty], 0 ) )
", riFactors[i].ToString("0.00")),
        folderRoot + "\\05 Target", "#,##0");
}


// ============================================================================
// SECTION 3 — NEW REVENUE-WEIGHTED MEASURES
// These elevate revenue as a first-class dimension per stakeholder feedback
// ============================================================================

// Revenue-weighted category priority: large gap + low share = top priority
UpsertMeasure(factTable, "MS Revenue-Weighted Category Priority",
@"
VAR GapEUR = [Pot Gap EUR]
VAR Share = [MS Estimated Share %]
RETURN
    IF (
        ISBLANK ( GapEUR ),
        BLANK (),
        ROUND ( GapEUR * ( 1 - COALESCE ( Share, 0 ) ), 0 )
    )
",
    folderRoot + "\\04 Opportunity", "#,##0");

// Category revenue rank (within current filter context)
UpsertMeasure(factTable, "MS Category Revenue Rank",
@"
IF (
    ISBLANK ( [Pot Realized Sales EUR] ),
    BLANK (),
    RANKX (
        ALL ( dim_terumo_category[terumo_category] ),
        [Pot Realized Sales EUR],
        , DESC, DENSE
    )
)
",
    folderRoot + "\\02 Revenue", "#,##0");

// Customer revenue rank
UpsertMeasure(factTable, "MS Customer Revenue Rank",
@"
IF (
    ISBLANK ( [Pot Realized Sales EUR] ),
    BLANK (),
    RANKX (
        ALL ( Dim_Cust[Customer] ),
        [Pot Realized Sales EUR],
        , DESC, DENSE
    )
)
",
    folderRoot + "\\02 Revenue", "#,##0");

// Revenue concentration: top 20% of customers' share of total revenue
UpsertMeasure(factTable, "MS Revenue Concentration Top20",
@"
VAR TotalCustomers =
    CALCULATE (
        DISTINCTCOUNT ( Sales_Category[Customer Id] ),
        REMOVEFILTERS ( Dim_Cust ),
        Sales_Category[Qty Sold] > 0
    )
VAR Top20Threshold = ROUNDUP ( TotalCustomers * 0.2, 0 )
VAR Top20Revenue =
    SUMX (
        TOPN (
            Top20Threshold,
            ADDCOLUMNS (
                VALUES ( Dim_Cust[Customer] ),
                ""@rev"", [Pot Realized Sales EUR]
            ),
            [@rev], DESC
        ),
        [@rev]
    )
VAR TotalRevenue =
    CALCULATE ( [Pot Realized Sales EUR], REMOVEFILTERS ( Dim_Cust ) )
RETURN
    DIVIDE ( Top20Revenue, TotalRevenue )
",
    folderRoot + "\\02 Revenue", "0.0%");

// Potential value EUR per customer (for sizing)
UpsertMeasure(factTable, "MS Customer Potential Value EUR",
@"
SUMX (
    VALUES ( dim_terumo_category[terumo_category] ),
    [MS Targetable Units] * [Pot Avg Price EUR]
)
",
    folderRoot + "\\04 Opportunity", "#,##0");

// Gap EUR as % of potential value (how much headroom remains)
UpsertMeasure(factTable, "MS Gap as Pct of Potential",
@"
VAR PotVal =
    SUMX (
        VALUES ( dim_terumo_category[terumo_category] ),
        [MS Targetable Units] * [Pot Avg Price EUR]
    )
RETURN
    DIVIDE ( [Pot Gap EUR], PotVal )
",
    folderRoot + "\\04 Opportunity", "0.0%");


// ============================================================================
// SECTION 4 — "HOW TO WIN — IN THIS CATEGORY" MEASURES
// Reverse of "In this account": for a selected category, rank customers
// ============================================================================

// Customer priority within a selected category
UpsertMeasure(factTable, "MS Customer Priority in Category",
@"
VAR GapUnits = [Pot Gap Units]
VAR RI = [MS Realization Index]
VAR RevShare = [MS Customer Revenue Share]
RETURN
    IF (
        ISBLANK ( GapUnits ) || GapUnits <= 0,
        0,
        ROUND ( GapUnits * COALESCE ( RevShare, 0.01 ) * DIVIDE ( MAX ( 0, 150 - COALESCE ( RI, 0 ) ), 100, 0 ), 0 )
    )
",
    folderRoot + "\\06 Category View", "#,##0");

// Customer action within category context
UpsertMeasure(factTable, "MS Customer Action in Category",
@"
VAR RI = [MS Realization Index]
VAR GapUnits = [Pot Gap Units]
RETURN
    SWITCH (
        TRUE (),
        ISBLANK ( GapUnits ), BLANK (),
        GapUnits <= 0, ""Fully Penetrated"",
        RI < 50, ""Priority Target"",
        RI < 80, ""Growth Opportunity"",
        RI < 100, ""Capture Remaining"",
        ""Protect Position""
    )
",
    folderRoot + "\\06 Category View", "");

// Category-level customer count (buying this category)
UpsertMeasure(factTable, "MS Category Customer Count",
@"
CALCULATE (
    DISTINCTCOUNT ( Sales_Category[Customer Id] ),
    Sales_Category[Qty Sold] > 0
)
",
    folderRoot + "\\06 Category View", "#,##0");

// Category-level non-buyer count (whitespace by customer)
UpsertMeasure(factTable, "MS Category Whitespace Customers",
@"
VAR TotalCustomersInScope =
    CALCULATE (
        DISTINCTCOUNT ( fact_market_potential[customer_id] ),
        REMOVEFILTERS ( dim_terumo_category )
    )
VAR BuyingCustomers = [MS Category Customer Count]
RETURN
    TotalCustomersInScope - BuyingCustomers
",
    folderRoot + "\\06 Category View", "#,##0");


// ============================================================================
// SECTION 5 — EXECUTIVE SUMMARY MEASURES
// For the new "Executive overview" page
// ============================================================================

// Total addressable market in EUR
UpsertMeasure(factTable, "MS Total Addressable Market EUR",
@"
SUMX (
    CROSSJOIN (
        VALUES ( Dim_Cust[Customer] ),
        VALUES ( dim_terumo_category[terumo_category] )
    ),
    [MS Targetable Units] * [Pot Avg Price EUR]
)
",
    folderRoot + "\\07 Executive", "€#,##0");

// Overall portfolio realization %
UpsertMeasure(factTable, "MS Portfolio Realization Pct",
@"
DIVIDE (
    [Pot Realized Sales EUR],
    CALCULATE (
        [MS Total Addressable Market EUR],
        REMOVEFILTERS ( Dim_Cust ),
        REMOVEFILTERS ( dim_terumo_category )
    )
)
",
    folderRoot + "\\07 Executive", "0.0%");

// Number of growth-target accounts (RI < 50)
UpsertMeasure(factTable, "MS Growth Target Account Count",
@"
COUNTROWS (
    FILTER (
        VALUES ( Dim_Cust[Customer] ),
        [MS Realization Index] < 50
            && NOT ISBLANK ( [MS Realization Index] )
    )
)
",
    folderRoot + "\\07 Executive", "#,##0");

// Number of champion accounts (RI >= 150)
UpsertMeasure(factTable, "MS Champion Account Count",
@"
COUNTROWS (
    FILTER (
        VALUES ( Dim_Cust[Customer] ),
        [MS Realization Index] >= 150
    )
)
",
    folderRoot + "\\07 Executive", "#,##0");

// Total gap EUR across all customers × categories
UpsertMeasure(factTable, "MS Total Gap EUR",
@"
SUMX (
    CROSSJOIN (
        VALUES ( Dim_Cust[Customer] ),
        VALUES ( dim_terumo_category[terumo_category] )
    ),
    [Pot Gap EUR]
)
",
    folderRoot + "\\07 Executive", "€#,##0");


// ============================================================================
// SECTION 6 — FOLDER REORGANISATION
// Move existing measures into the v2 folder structure
// ============================================================================

string[,] folderMoves = {
    // measure name, new folder
    { "Pot Total Potential Units", folderRoot + "\\01 Core" },
    { "Pot Total Procedures (dedup)", folderRoot + "\\01 Core" },
    { "Pot Realization %", folderRoot + "\\01 Core" },
    { "Pot Avg Price EUR", folderRoot + "\\03 Value" },
    { "Pot Potential Value EUR", folderRoot + "\\04 Opportunity" },
    { "Pot Gap Units", folderRoot + "\\04 Opportunity" },
    { "Pot Gap EUR", folderRoot + "\\04 Opportunity" },
    { "Pot Realized Sales EUR (DNA total)", folderRoot + "\\01 Core" },
    { "MS National Realization Pct", folderRoot + "\\02 Benchmark" },
    { "MS Realization Index", folderRoot + "\\02 Benchmark" },
    { "MS Benchmark Share %", folderRoot + "\\02 Benchmark" },
    { "MS Benchmark Level", folderRoot + "\\02 Benchmark" },
    { "MS Avg Price by Category", folderRoot + "\\03 Value" },
    { "MS Category Revenue Share", folderRoot + "\\02 Revenue" },
    { "MS Customer Revenue Share", folderRoot + "\\02 Revenue" },
    { "MS Revenue Opportunity", folderRoot + "\\04 Opportunity" },
    { "MS Customer Category Mix", folderRoot + "\\03 Customer Strength" },
    { "MS National Category Mix", folderRoot + "\\03 Customer Strength" },
    { "MS Mix Index", folderRoot + "\\03 Customer Strength" },
    { "MS Category Coverage", folderRoot + "\\03 Customer Strength" },
    { "MS Whitespace Count", folderRoot + "\\03 Customer Strength" },
    { "MS Customer Strength Badge", folderRoot + "\\04 Account Priority" },
    { "MS Customer Action Badge", folderRoot + "\\04 Account Priority" },
    { "MS Account Priority Score", folderRoot + "\\04 Account Priority" },
    { "MS Weighted Opportunity Score", folderRoot + "\\04 Opportunity" },
    { "MS Category Priority Score", folderRoot + "\\04 Opportunity" },
    { "MS Target RI Value", folderRoot + "\\05 Target" },
    { "MS Target RI Label", folderRoot + "\\05 Target" },
    { "MS Current vs Target Status", folderRoot + "\\05 Target" },
    { "MS Action Flag", folderRoot + "\\05 Target" },
};

var ft = Model.Tables[factTable];
for (int i = 0; i < folderMoves.GetLength(0); i++) {
    var mName = folderMoves[i, 0];
    var mFolder = folderMoves[i, 1];
    if (ft.Measures.Contains(mName)) {
        ft.Measures[mName].DisplayFolder = mFolder;
    }
}


// ============================================================================
// DONE — Summary
// ============================================================================
// New measures created:  ~20
// Existing measures fixed: 8 (dynamic year)
// Folder moves: 30
//
// After running:
//   1. Save model (Ctrl+S)
//   2. Verify _Current Sales Year and _Current Potential Year return correct values
//   3. Spot-check MS Estimated Share % hasn't changed values (dynamic year = same year)
//   4. Check Pot Total Potential Units (Latest) matches old (2024) version
//   5. Deploy and process
// ============================================================================

Info("Script complete. Created/updated measures in '" + factTable + "' under folder '" + folderRoot + "'.");
