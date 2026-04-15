#!/usr/bin/env python3
"""
build_mpr.py — Market Potential Report: create all visuals + bind fields
Run from: C:/Users/adebo/reports/market-potential-report/
Usage:     python build_mpr.py
"""
import subprocess, os, json, sys

PBIR = "C:/Users/adebo/AppData/Roaming/Python/Python312/Scripts/pbir.exe"
RPT  = "Market Potential Report.Report"
CWD  = "C:/Users/adebo/reports/market-potential-report"
FACT = "fact_market_potential"

PAGES = {
    "p1": "ExecutiveOverview",
    "p2": "49be14b5b29746e5",
    "p3": "55d24ffa308af020",
    "p4": "d228ca413dc2a0f1",
    "p5": "3a5d3709ba6bc2df",
}

errors = []
# Strip PYTHON* env vars so the frozen pbir.exe doesn't inherit conflicting Python env
_ENV = {k: v for k, v in os.environ.items() if not k.startswith("PYTHON")}

# ─────────────────────────────────────────────────────────────────────────────
def run(*args):
    cmd = [PBIR, "-q"] + list(args)
    r = subprocess.run(cmd, capture_output=True, cwd=CWD, env=_ENV)
    out = (r.stdout or b"").decode("utf-8", errors="replace")
    err = (r.stderr or b"").decode("utf-8", errors="replace")
    return (out + err).strip()

def add_visual(key, page_folder, vtype, title, name, x, y, w, h):
    out = run("add", "visual", vtype, f"{RPT}/{page_folder}.Page",
              "--title", title, "--name", name,
              "--x", str(x), "--y", str(y), "--width", str(w), "--height", str(h))
    if "already exists" in out:
        print(f"  = {key}: exists (skip)")   # idempotent
    elif "Error" in out and "Schema" in out:
        errors.append(f"add_visual({key}): {out[:200]}")
        print(f"  ! {key}: schema error")
    elif "Created" in out or "Path:" in out:
        print(f"  + {key}: {name}")
    else:
        errors.append(f"add_visual({key}): {out[:200]}")
        print(f"  ! {key}: {out[:80]}")

def bind_path(key, vid_name, page, role, table, field, is_measure, clear_first=False):
    path  = f"{RPT}/{page}.Page/{vid_name}.Visual"
    ftype = "Measure" if is_measure else "Column"
    if clear_first:
        run("visuals", "bind", path, "--clear", role, "--no-validate")
    out   = run("visuals", "bind", path,
                "--add", f"{role}:{table}.{field}",
                "--type", ftype, "--no-validate")
    if "error" in out.lower() and "already has" not in out.lower():
        errors.append(f"bind({key},{role},{field}): {out[:120]}")
    elif "already has" in out.lower():
        print(f"  = {key}.{role} -> {field} (skip: already bound)")
    else:
        print(f"  + {key}.{role} -> {field}")

def bm(key, vid, page, role, measure, clear_first=False):
    """Bind a measure (type=Measure)."""
    bind_path(key, vid, page, role, FACT, measure, True, clear_first)

def bc(key, vid, page, role, table, col, clear_first=False):
    """Bind a column (type=Column)."""
    bind_path(key, vid, page, role, table, col, False, clear_first)

# ─────────────────────────────────────────────────────────────────────────────
# All visuals with explicit names (short, schema-safe)
# ─────────────────────────────────────────────────────────────────────────────

# Each entry: (key, page_key, vtype, title, name, x, y, w, h)
VISUALS = [
    # ── P1: Executive Overview ──────────────────────────────────────────────
    ("p1_sl_cntry", "p1","slicer",           "Country",                    "p1-sl-cntry",  16, 120, 408,  40),
    ("p1_sl_seg",   "p1","slicer",           "Segment",                    "p1-sl-seg",   432, 120, 408,  40),
    ("p1_sl_cat",   "p1","slicer",           "Category",                   "p1-sl-cat",   848, 120, 416,  40),
    ("p1_c_tam",    "p1","cardVisual",       "Total Addressable Market",   "p1-c-tam",     16, 168, 200,  80),
    ("p1_c_rev",    "p1","cardVisual",       "Realized Sales EUR",         "p1-c-rev",    224, 168, 200,  80),
    ("p1_c_gap",    "p1","cardVisual",       "Total Gap EUR",              "p1-c-gap",    432, 168, 200,  80),
    ("p1_c_pct",    "p1","cardVisual",       "Portfolio Realization",      "p1-c-pct",    640, 168, 200,  80),
    ("p1_c_champ",  "p1","cardVisual",       "Champion Accounts",         "p1-c-champ",   848, 168, 200,  80),
    ("p1_c_grwth",  "p1","cardVisual",       "Growth Target Accounts",    "p1-c-grwth",  1056, 168, 208,  80),
    ("p1_bar",      "p1","clusteredBarChart","Revenue by Category",        "p1-bar",       16, 256, 616, 216),
    ("p1_tmap",     "p1","treemap",          "Gap Opportunity Map",        "p1-tmap",     640, 256, 624, 216),
    ("p1_scat",     "p1","scatterChart",     "Revenue vs RI",              "p1-scat",      16, 480, 616, 208),
    ("p1_tbl",      "p1","tableEx",          "Country Summary",            "p1-tbl",      640, 480, 624, 208),
    # ── P2: Where to Go — Products ─────────────────────────────────────────
    ("p2_sl_cntry", "p2","slicer",           "Country",                    "p2-sl-cntry",  16, 120, 408,  40),
    ("p2_sl_proc",  "p2","slicer",           "Procedure Group",            "p2-sl-proc",  432, 120, 408,  40),
    ("p2_sl_cat",   "p2","slicer",           "Category",                   "p2-sl-cat",   848, 120, 416,  40),
    ("p2_c_rev",    "p2","cardVisual",       "Realized Sales EUR",         "p2-c-rev",     16, 168, 200,  80),
    ("p2_c_qty",    "p2","cardVisual",       "Realized Units",             "p2-c-qty",    224, 168, 200,  80),
    ("p2_c_pot",    "p2","cardVisual",       "Total Potential Units",      "p2-c-pot",    432, 168, 200,  80),
    ("p2_c_gapq",   "p2","cardVisual",       "Gap Units",                  "p2-c-gapq",   640, 168, 200,  80),
    ("p2_c_gapeur", "p2","cardVisual",       "Gap EUR",                    "p2-c-gapeur", 848, 168, 200,  80),
    ("p2_c_potval", "p2","cardVisual",       "Potential Value EUR",        "p2-c-potval",1056, 168, 208,  80),
    ("p2_bar_main", "p2","clusteredBarChart","Revenue Opportunity",        "p2-bar-main",  16, 256,1248, 192),
    ("p2_bar_rev",  "p2","clusteredBarChart","Revenue Share by Category",  "p2-bar-rev",   16, 456, 616, 128),
    ("p2_bar_ri",   "p2","clusteredBarChart","Realization Index",          "p2-bar-ri",   640, 456, 624, 128),
    ("p2_tbl",      "p2","tableEx",          "Category Detail",            "p2-tbl",       16, 592,1248, 104),
    # ── P3: Where to Go — Customers ────────────────────────────────────────
    ("p3_sl_cntry", "p3","slicer",           "Country",                    "p3-sl-cntry",  16, 120, 408,  40),
    ("p3_sl_seg",   "p3","slicer",           "Segment",                    "p3-sl-seg",   432, 120, 408,  40),
    ("p3_sl_cat",   "p3","slicer",           "Category",                   "p3-sl-cat",   848, 120, 416,  40),
    ("p3_c_rev",    "p3","cardVisual",       "Realized Sales EUR",         "p3-c-rev",     16, 168, 306,  80),
    ("p3_c_qty",    "p3","cardVisual",       "Realized Units",             "p3-c-qty",    330, 168, 306,  80),
    ("p3_c_natnl",  "p3","cardVisual",       "National Realization",       "p3-c-natnl",  644, 168, 306,  80),
    ("p3_c_conc",   "p3","cardVisual",       "Revenue Concentration",      "p3-c-conc",   958, 168, 306,  80),
    ("p3_scat",     "p3","scatterChart",     "Customer Opportunity Map",   "p3-scat",      16, 256,1248, 240),
    ("p3_tbl",      "p3","tableEx",          "Customer Detail",            "p3-tbl",       16, 504,1248, 192),
    # ── P4: How to Win — In this Category ──────────────────────────────────
    ("p4_sl_cntry", "p4","slicer",           "Country",                    "p4-sl-cntry",  16, 120, 408,  40),
    ("p4_sl_seg",   "p4","slicer",           "Segment",                    "p4-sl-seg",   432, 120, 408,  40),
    ("p4_sl_cat",   "p4","slicer",           "Category (Select One)",      "p4-sl-cat",   848, 120, 416,  40),
    ("p4_c_rev",    "p4","cardVisual",       "Realized Sales EUR",         "p4-c-rev",     16, 168, 243,  80),
    ("p4_c_revsh",  "p4","cardVisual",       "Category Revenue Share",     "p4-c-revsh",  267, 168, 243,  80),
    ("p4_c_custs",  "p4","cardVisual",       "Buying Customers",           "p4-c-custs",  518, 168, 243,  80),
    ("p4_c_white",  "p4","cardVisual",       "Whitespace Customers",       "p4-c-white",  769, 168, 243,  80),
    ("p4_c_ri",     "p4","cardVisual",       "Realization Index",          "p4-c-ri",    1020, 168, 244,  80),
    ("p4_bar",      "p4","clusteredBarChart","Top 20 Gap Accounts",        "p4-bar",       16, 256,1248, 216),
    ("p4_tbl",      "p4","tableEx",          "Customer Detail by Category","p4-tbl",       16, 480,1248, 224),
    # ── P5: How to Win — In this Account ────────────────────────────────────
    ("p5_sl_cntry", "p5","slicer",           "Country",                    "p5-sl-cntry",  16, 120, 408,  40),
    ("p5_sl_seg",   "p5","slicer",           "Segment",                    "p5-sl-seg",   432, 120, 408,  40),
    ("p5_sl_cat",   "p5","slicer",           "Category",                   "p5-sl-cat",   848, 120, 416,  40),
    ("p5_sl_cust",  "p5","slicer",           "Customer Name (Select One)", "p5-sl-cust",   16, 168, 716,  40),
    ("p5_sl_tri",   "p5","slicer",           "Target RI",                  "p5-sl-tri",   740, 168, 524,  40),
    ("p5_c_rev",    "p5","cardVisual",       "Realized Sales EUR",         "p5-c-rev",     16, 216, 200,  72),
    ("p5_c_qty",    "p5","cardVisual",       "Realized Units",             "p5-c-qty",    224, 216, 200,  72),
    ("p5_c_ri",     "p5","cardVisual",       "Realization Index",          "p5-c-ri",     432, 216, 200,  72),
    ("p5_c_str",    "p5","cardVisual",       "Customer Strength Badge",    "p5-c-str",    640, 216, 200,  72),
    ("p5_c_cov",    "p5","cardVisual",       "Category Coverage",          "p5-c-cov",    848, 216, 200,  72),
    ("p5_c_wht",    "p5","cardVisual",       "Whitespace Count",           "p5-c-wht",   1056, 216, 208,  72),
    ("p5_bar_ri",   "p5","clusteredBarChart","RI by Category",             "p5-bar-ri",    16, 296, 496, 184),
    ("p5_tbl_mix",  "p5","tableEx",          "Category Mix Analysis",      "p5-tbl-mix",  520, 296, 744, 184),
    ("p5_c_ri50",   "p5","cardVisual",       "Units to RI 50",             "p5-c-ri50",    16, 488, 306,  72),
    ("p5_c_ri75",   "p5","cardVisual",       "Units to RI 75",             "p5-c-ri75",   330, 488, 306,  72),
    ("p5_c_ri100",  "p5","cardVisual",       "Units to RI 100",            "p5-c-ri100",  644, 488, 306,  72),
    ("p5_c_ri150",  "p5","cardVisual",       "Units to RI 150",            "p5-c-ri150",  958, 488, 306,  72),
    ("p5_bar_tgt",  "p5","stackedBarChart",  "Current vs Target Units",    "p5-bar-tgt",   16, 568,1248, 136),
]

print("=== Creating visuals ===")
prev_page = None
for (key, pg, vtype, title, name, x, y, w, h) in VISUALS:
    page_folder = PAGES[pg]
    if pg != prev_page:
        print(f"\n--- {pg}: {page_folder} ---")
        prev_page = pg
    add_visual(key, page_folder, vtype, title, name, x, y, w, h)

print(f"\nTotal created: {len(VISUALS) - len(errors)} | Errors: {len(errors)}")

# ─────────────────────────────────────────────────────────────────────────────
# BINDINGS — uses the explicit names defined in VISUALS
# ─────────────────────────────────────────────────────────────────────────────
print("\n=== Binding fields ===")

P = PAGES   # shorthand

# P1 — slicers
bc("p1_sl_cntry", "p1-sl-cntry", P["p1"], "Values", "Shp_Dim_Country_Hierarchy", "Country Text")
bc("p1_sl_seg",   "p1-sl-seg",   P["p1"], "Values", "Dim_Cust",                  "TIS Final Segmenation")
bc("p1_sl_cat",   "p1-sl-cat",   P["p1"], "Values", "dim_terumo_category",       "terumo_category")
# P1 — cards
bm("p1_c_tam",   "p1-c-tam",   P["p1"], "Data", "MS Total Addressable Market EUR")
bm("p1_c_rev",   "p1-c-rev",   P["p1"], "Data", "Pot Realized Sales EUR")
bm("p1_c_gap",   "p1-c-gap",   P["p1"], "Data", "MS Total Gap EUR")
bm("p1_c_pct",   "p1-c-pct",   P["p1"], "Data", "MS Portfolio Realization Pct")
bm("p1_c_champ", "p1-c-champ", P["p1"], "Data", "MS Champion Account Count")
bm("p1_c_grwth", "p1-c-grwth", P["p1"], "Data", "MS Growth Target Account Count")
# P1 — bar
bc("p1_bar", "p1-bar", P["p1"], "Category", "dim_terumo_category", "terumo_category", True)
bm("p1_bar", "p1-bar", P["p1"], "Y",  "Pot Realized Sales EUR")
bm("p1_bar", "p1-bar", P["p1"], "Y",  "Pot Gap EUR")
# P1 — treemap
bc("p1_tmap", "p1-tmap", P["p1"], "Category", "dim_terumo_category", "terumo_category", True)
bm("p1_tmap", "p1-tmap", P["p1"], "Values", "Pot Gap EUR")
# P1 — scatter
bm("p1_scat", "p1-scat", P["p1"], "X",       "Pot Realized Sales EUR", True)
bm("p1_scat", "p1-scat", P["p1"], "Y",       "MS Realization Index", True)
bm("p1_scat", "p1-scat", P["p1"], "Size",    "Pot Gap EUR", True)
bc("p1_scat", "p1-scat", P["p1"], "Category", "Shp_Dim_Country_Hierarchy", "Country Text", True)
# P1 — table
bc("p1_tbl", "p1-tbl", P["p1"], "Values", "Shp_Dim_Country_Hierarchy", "Country Text")
bm("p1_tbl", "p1-tbl", P["p1"], "Values", "Pot Realized Sales EUR")
bm("p1_tbl", "p1-tbl", P["p1"], "Values", "MS Realization Index")
bm("p1_tbl", "p1-tbl", P["p1"], "Values", "Pot Gap EUR")
bm("p1_tbl", "p1-tbl", P["p1"], "Values", "MS Growth Target Account Count")
bm("p1_tbl", "p1-tbl", P["p1"], "Values", "MS Champion Account Count")

# P2 — slicers
bc("p2_sl_cntry", "p2-sl-cntry", P["p2"], "Values", "Shp_Dim_Country_Hierarchy", "Country Text")
bc("p2_sl_proc",  "p2-sl-proc",  P["p2"], "Values", "dim_procedure",             "procedure_group")
bc("p2_sl_cat",   "p2-sl-cat",   P["p2"], "Values", "dim_terumo_category",       "terumo_category")
# P2 — cards
bm("p2_c_rev",    "p2-c-rev",    P["p2"], "Data", "Pot Realized Sales EUR")
bm("p2_c_qty",    "p2-c-qty",    P["p2"], "Data", "Pot Realized Qty")
bm("p2_c_pot",    "p2-c-pot",    P["p2"], "Data", "Pot Total Potential Units (Latest)")
bm("p2_c_gapq",   "p2-c-gapq",  P["p2"], "Data", "Pot Gap Units")
bm("p2_c_gapeur", "p2-c-gapeur",P["p2"], "Data", "Pot Gap EUR")
bm("p2_c_potval", "p2-c-potval",P["p2"], "Data", "Pot Potential Value EUR")
# P2 — primary bar
bc("p2_bar_main", "p2-bar-main", P["p2"], "Category", "dim_terumo_category", "terumo_category", True)
bm("p2_bar_main", "p2-bar-main", P["p2"], "Y",  "Pot Realized Sales EUR")
bm("p2_bar_main", "p2-bar-main", P["p2"], "Y",  "Pot Gap EUR")
# P2 — revenue share bar
bc("p2_bar_rev", "p2-bar-rev", P["p2"], "Category", "dim_terumo_category", "terumo_category", True)
bm("p2_bar_rev", "p2-bar-rev", P["p2"], "Y",  "MS Category Revenue Share")
# P2 — RI bar
bc("p2_bar_ri", "p2-bar-ri", P["p2"], "Category", "dim_terumo_category", "terumo_category", True)
bm("p2_bar_ri", "p2-bar-ri", P["p2"], "Y",  "MS Realization Index")
# P2 — table
bc("p2_tbl", "p2-tbl", P["p2"], "Values", "dim_terumo_category", "terumo_category")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "Pot Realized Sales EUR")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "MS Category Revenue Share")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "Pot Realized Qty")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "Pot Total Potential Units (Latest)")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "MS Estimated Share %")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "MS Realization Index")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "Pot Gap EUR")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "MS Revenue-Weighted Category Priority")
bm("p2_tbl", "p2-tbl", P["p2"], "Values", "MS Action Flag")

# P3 — slicers
bc("p3_sl_cntry", "p3-sl-cntry", P["p3"], "Values", "Shp_Dim_Country_Hierarchy", "Country Text")
bc("p3_sl_seg",   "p3-sl-seg",   P["p3"], "Values", "Dim_Cust",                  "TIS Final Segmenation")
bc("p3_sl_cat",   "p3-sl-cat",   P["p3"], "Values", "dim_terumo_category",       "terumo_category")
# P3 — cards
bm("p3_c_rev",   "p3-c-rev",   P["p3"], "Data", "Pot Realized Sales EUR")
bm("p3_c_qty",   "p3-c-qty",   P["p3"], "Data", "Pot Realized Qty")
bm("p3_c_natnl", "p3-c-natnl",P["p3"], "Data", "MS National Realization Pct")
bm("p3_c_conc",  "p3-c-conc", P["p3"], "Data", "MS Revenue Concentration Top20")
# P3 — scatter
bm("p3_scat", "p3-scat", P["p3"], "X",       "Pot Realized Sales EUR", True)
bm("p3_scat", "p3-scat", P["p3"], "Y",       "MS Realization Index", True)
bm("p3_scat", "p3-scat", P["p3"], "Size",    "MS Weighted Opportunity Score", True)
# p3_scat Legend skipped: measures not allowed in Legend role; apply via CF instead
bc("p3_scat", "p3-scat", P["p3"], "Category", "Dim_Cust", "Customer Name", True)
# P3 — table
bc("p3_tbl", "p3-tbl", P["p3"], "Values", "Dim_Cust", "Customer Name")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "Pot Realized Sales EUR")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "MS Customer Revenue Share")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "Pot Realized Qty")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "MS Realization Index")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "MS Category Coverage")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "MS Whitespace Count")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "Pot Gap EUR")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "MS Account Priority Score")
bm("p3_tbl", "p3-tbl", P["p3"], "Values", "MS Customer Action Badge")

# P4 — slicers
bc("p4_sl_cntry", "p4-sl-cntry", P["p4"], "Values", "Shp_Dim_Country_Hierarchy", "Country Text")
bc("p4_sl_seg",   "p4-sl-seg",   P["p4"], "Values", "Dim_Cust",                  "TIS Final Segmenation")
bc("p4_sl_cat",   "p4-sl-cat",   P["p4"], "Values", "dim_terumo_category",       "terumo_category")
# P4 — cards
bm("p4_c_rev",   "p4-c-rev",   P["p4"], "Data", "Pot Realized Sales EUR")
bm("p4_c_revsh", "p4-c-revsh", P["p4"], "Data", "MS Category Revenue Share")
bm("p4_c_custs", "p4-c-custs", P["p4"], "Data", "MS Category Customer Count")
bm("p4_c_white", "p4-c-white", P["p4"], "Data", "MS Category Whitespace Customers")
bm("p4_c_ri",    "p4-c-ri",    P["p4"], "Data", "MS Realization Index")
# P4 — bar
bc("p4_bar", "p4-bar", P["p4"], "Category", "Dim_Cust",  "Customer Name", True)
bm("p4_bar", "p4-bar", P["p4"], "Y",  "Pot Realized Qty")
bm("p4_bar", "p4-bar", P["p4"], "Y",  "Pot Gap Units")
# P4 — table
bc("p4_tbl", "p4-tbl", P["p4"], "Values", "Dim_Cust", "Customer Name")
bc("p4_tbl", "p4-tbl", P["p4"], "Values", FACT,       "customer_segment")
bc("p4_tbl", "p4-tbl", P["p4"], "Values", "Shp_Dim_Country_Hierarchy", "Country Text")
bm("p4_tbl", "p4-tbl", P["p4"], "Values", "Pot Realized Qty")
bm("p4_tbl", "p4-tbl", P["p4"], "Values", "Pot Realized Sales EUR")
bm("p4_tbl", "p4-tbl", P["p4"], "Values", "MS Realization Index")
bm("p4_tbl", "p4-tbl", P["p4"], "Values", "Pot Gap Units")
bm("p4_tbl", "p4-tbl", P["p4"], "Values", "Pot Gap EUR")
bm("p4_tbl", "p4-tbl", P["p4"], "Values", "MS Customer Priority in Category")
bm("p4_tbl", "p4-tbl", P["p4"], "Values", "MS Customer Action in Category")

# P5 — slicers
bc("p5_sl_cntry", "p5-sl-cntry", P["p5"], "Values", "Shp_Dim_Country_Hierarchy", "Country Text")
bc("p5_sl_seg",   "p5-sl-seg",   P["p5"], "Values", "Dim_Cust",                  "TIS Final Segmenation")
bc("p5_sl_cat",   "p5-sl-cat",   P["p5"], "Values", "dim_terumo_category",       "terumo_category")
bc("p5_sl_cust",  "p5-sl-cust",  P["p5"], "Values", "Dim_Cust",                  "Customer Name")
bc("p5_sl_tri",   "p5-sl-tri",   P["p5"], "Values", "Target RI",                 "Value")
# P5 — cards
bm("p5_c_rev",  "p5-c-rev",  P["p5"], "Data", "Pot Realized Sales EUR")
bm("p5_c_qty",  "p5-c-qty",  P["p5"], "Data", "Pot Realized Qty")
bm("p5_c_ri",   "p5-c-ri",   P["p5"], "Data", "MS Realization Index")
bm("p5_c_str",  "p5-c-str",  P["p5"], "Data", "MS Customer Strength Badge")
bm("p5_c_cov",  "p5-c-cov",  P["p5"], "Data", "MS Category Coverage")
bm("p5_c_wht",  "p5-c-wht",  P["p5"], "Data", "MS Whitespace Count")
# P5 — RI bar
bc("p5_bar_ri",  "p5-bar-ri",  P["p5"], "Category", "dim_terumo_category", "terumo_category", True)
bm("p5_bar_ri",  "p5-bar-ri",  P["p5"], "Y",  "MS Realization Index")
# P5 — mix table
bc("p5_tbl_mix", "p5-tbl-mix", P["p5"], "Values", "dim_terumo_category", "terumo_category")
bm("p5_tbl_mix", "p5-tbl-mix", P["p5"], "Values", "MS Customer Category Mix")
bm("p5_tbl_mix", "p5-tbl-mix", P["p5"], "Values", "MS National Category Mix")
bm("p5_tbl_mix", "p5-tbl-mix", P["p5"], "Values", "MS Mix Index")
bm("p5_tbl_mix", "p5-tbl-mix", P["p5"], "Values", "MS Realization Index")
bm("p5_tbl_mix", "p5-tbl-mix", P["p5"], "Values", "MS Customer Action Badge")
bm("p5_tbl_mix", "p5-tbl-mix", P["p5"], "Values", "MS Benchmark Level")
# P5 — RI target cards
bm("p5_c_ri50",  "p5-c-ri50",  P["p5"], "Data", "MS Units to Reach RI 50")
bm("p5_c_ri75",  "p5-c-ri75",  P["p5"], "Data", "MS Units to Reach RI 75")
bm("p5_c_ri100", "p5-c-ri100", P["p5"], "Data", "MS Units to Reach RI 100")
bm("p5_c_ri150", "p5-c-ri150", P["p5"], "Data", "MS Units to Reach RI 150")
# P5 — target stacked bar
bc("p5_bar_tgt", "p5-bar-tgt", P["p5"], "Category", "dim_terumo_category", "terumo_category", True)
bm("p5_bar_tgt", "p5-bar-tgt", P["p5"], "Y",  "Pot Realized Qty")
bm("p5_bar_tgt", "p5-bar-tgt", P["p5"], "Y",  "MS Units to Target")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"Build errors: {len(errors)}")
if errors:
    for e in errors[:20]:
        print(f"  ! {e}")
print("Next step: run apply_cf_mpr.sh")
print('='*60)
