"""
bind_visuals_ms.py — binds all fields/measures to visual queryState.
PBIR schema 2.7.0: queryState only (no dataTransforms).
"""
import json, os

PAGES = "C:/Users/adebo/Reports/market-share-dashboard/MarketShare.Report/definition/pages"

def col(entity, prop):
    return {"Column": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}

def msr(entity, prop):
    return {"Measure": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}

def cref(e, p):  return f"{e}.{p}"
def mref(e, p):  return f"Sum({e}.{p})"

def slicer_qs(entity, prop):
    return {"Field": {"projections": [{"field": col(entity, prop), "queryRef": cref(entity, prop), "active": True}]}}

def card_qs(entity, prop):
    return {"Values": {"projections": [{"field": msr(entity, prop), "queryRef": mref(entity, prop), "active": True}]}}

def chart_qs(cat_e, cat_p, y_e, y_p, y_msr=True, ser_e=None, ser_p=None):
    cp = col(cat_e, cat_p); cq = cref(cat_e, cat_p)
    yp = msr(y_e, y_p) if y_msr else col(y_e, y_p)
    yq = mref(y_e, y_p) if y_msr else cref(y_e, y_p)
    qs = {"Category": {"projections": [{"field": cp, "queryRef": cq, "active": True}]},
          "Y":        {"projections": [{"field": yp, "queryRef": yq, "active": True}]}}
    if ser_e and ser_p:
        qs["Series"] = {"projections": [{"field": col(ser_e, ser_p), "queryRef": cref(ser_e, ser_p), "active": True}]}
    return qs

def scatter_qs(x_e, x_p, y_e, y_p, size_e, size_p, det_e, det_p, leg_e, leg_p):
    return {
        "X":       {"projections": [{"field": msr(x_e, x_p),    "queryRef": mref(x_e, x_p),    "active": True}]},
        "Y":       {"projections": [{"field": msr(y_e, y_p),    "queryRef": mref(y_e, y_p),    "active": True}]},
        "Size":    {"projections": [{"field": msr(size_e,size_p),"queryRef": mref(size_e,size_p),"active": True}]},
        "Details": {"projections": [{"field": col(det_e, det_p), "queryRef": cref(det_e, det_p),"active": True}]},
        "Legend":  {"projections": [{"field": msr(leg_e, leg_p), "queryRef": mref(leg_e, leg_p),"active": True}]},
    }

def table_qs(*fields):
    """fields: list of (entity, prop, is_msr)"""
    projs = []
    for ent, prop, is_msr in fields:
        f = msr(ent, prop) if is_msr else col(ent, prop)
        q = mref(ent, prop) if is_msr else cref(ent, prop)
        projs.append({"field": f, "queryRef": q, "active": True})
    return {"Values": {"projections": projs}}

# ── master binding map: visual folder name -> queryState dict ─────────────────
BINDINGS = {
    # PAGE 1 slicers
    "cat-slicer":   slicer_qs("dim_terumo_category", "terumo_category"),
    "proc-slicer":  slicer_qs("dim_procedure", "procedure_group"),
    "cty-slicer":   slicer_qs("Shp_Dim_Country_Hierarchy", "Country Text"),
    # PAGE 1 cards
    "real-pct-card":  card_qs("fact_market_potential", "Pot Realization %"),
    "real-qty-card":  card_qs("fact_market_potential", "Pot Realized Qty"),
    "real-rev-card":  card_qs("fact_market_potential", "Pot Realized Sales EUR"),
    "tot-pot-card":   card_qs("fact_market_potential", "Pot Total Potential Units"),
    "unit-gap-card":  card_qs("fact_market_potential", "Pot Gap Units"),
    "rev-gap-card":   card_qs("fact_market_potential", "Pot Gap EUR"),
    # PAGE 1 charts
    "real-by-cat-bar": chart_qs("dim_terumo_category", "terumo_category", "fact_market_potential", "Pot Realization %"),
    "rev-imp-bar":     chart_qs("dim_terumo_category", "terumo_category", "fact_market_potential", "MS Category Revenue Share"),
    "unit-gap-by-cat": chart_qs("dim_terumo_category", "terumo_category", "fact_market_potential", "Pot Gap Units"),
    # PAGE 2 slicers
    "p2-cat-slicer": slicer_qs("dim_terumo_category", "terumo_category"),
    "p2-cty-slicer": slicer_qs("Shp_Dim_Country_Hierarchy", "Country Text"),
    "p2-seg-slicer": slicer_qs("fact_market_potential", "customer_segment"),
    # PAGE 2 cards
    "p2-active-cust-card": card_qs("fact_market_potential", "Pot Realized Qty"),
    "p2-natl-real-card":   card_qs("fact_market_potential", "MS National Realization Pct"),
    "p2-tot-rev-card":     card_qs("fact_market_potential", "Pot Realized Sales EUR"),
    # PAGE 2 scatter
    "customer-quadrant-scatter": scatter_qs(
        "fact_market_potential", "Pot Realized Qty",
        "fact_market_potential", "MS Category Coverage",
        "fact_market_potential", "MS Weighted Opportunity Score",
        "Dim_Cust",              "Customer Name",
        "fact_market_potential", "MS Customer Action Badge",
    ),
    # PAGE 2 table
    "top-opp-accounts-table": table_qs(
        ("Dim_Cust",             "Customer Name",              False),
        ("fact_market_potential","Pot Realized Qty",            True),
        ("fact_market_potential","Pot Realized Sales EUR",      True),
        ("fact_market_potential","MS Realization Index",        True),
        ("fact_market_potential","MS Category Coverage",        True),
        ("fact_market_potential","MS Whitespace Count",         True),
        ("fact_market_potential","Pot Gap Units",               True),
        ("fact_market_potential","MS Account Priority Score",   True),
        ("fact_market_potential","MS Customer Action Badge",    True),
    ),
    # PAGE 3 slicers
    "p3-cust-slicer": slicer_qs("Dim_Cust", "Customer Name"),
    "p3-cat-slicer":  slicer_qs("dim_terumo_category", "terumo_category"),
    "p3-cty-slicer":  slicer_qs("Shp_Dim_Country_Hierarchy", "Country Text"),
    "p3-seg-slicer":  slicer_qs("fact_market_potential", "customer_segment"),
    # PAGE 3 cards
    "p3-ri-card":       card_qs("fact_market_potential", "MS Realization Index"),
    "p3-realqty-card":  card_qs("fact_market_potential", "Pot Realized Qty"),
    "p3-realrev-card":  card_qs("fact_market_potential", "Pot Realized Sales EUR"),
    "p3-custpot-card":  card_qs("fact_market_potential", "Pot Total Potential Units"),
    "p3-catcov-card":   card_qs("fact_market_potential", "MS Category Coverage"),
    "p3-white-card":    card_qs("fact_market_potential", "MS Whitespace Count"),
    "p3-strength-badge-card": card_qs("fact_market_potential", "MS Customer Strength Badge"),
    # PAGE 3 chart + table
    "penetration-by-cat-bar": chart_qs("dim_terumo_category", "terumo_category", "fact_market_potential", "MS Realization Index"),
    "cat-mix-table": table_qs(
        ("dim_terumo_category",  "terumo_category",          False),
        ("fact_market_potential","MS Customer Category Mix",  True),
        ("fact_market_potential","MS National Category Mix",  True),
        ("fact_market_potential","MS Mix Index",              True),
        ("fact_market_potential","MS Realization Index",      True),
        ("fact_market_potential","MS Customer Action Badge",  True),
    ),
    # PAGE 4 slicers
    "p4-cust-slicer":  slicer_qs("Dim_Cust", "Customer Name"),
    "p4-cat-slicer":   slicer_qs("dim_terumo_category", "terumo_category"),
    "p4-cty-slicer":   slicer_qs("Shp_Dim_Country_Hierarchy", "Country Text"),
    "target-ri-slider": slicer_qs("Target RI", "Value"),
    # PAGE 4 header cards
    "p4-tgt-ri-readout-card": card_qs("fact_market_potential", "MS Target RI Value"),
    "p4-tgt-label-card":      card_qs("fact_market_potential", "MS Target RI Label"),
    # PAGE 4 milestone cards
    "p4-mi-50-card":  card_qs("fact_market_potential", "MS Units to Reach RI 50"),
    "p4-mi-75-card":  card_qs("fact_market_potential", "MS Units to Reach RI 75"),
    "p4-mi-100-card": card_qs("fact_market_potential", "MS Units to Reach RI 100"),
    "p4-mi-150-card": card_qs("fact_market_potential", "MS Units to Reach RI 150"),
    # PAGE 4 chart
    "actual-vs-needed-bar": {
        "Category": {"projections": [{"field": col("dim_terumo_category","terumo_category"), "queryRef": cref("dim_terumo_category","terumo_category"), "active": True}]},
        "Y": {"projections": [
            {"field": msr("fact_market_potential","Pot Realized Qty"),    "queryRef": mref("fact_market_potential","Pot Realized Qty"),    "active": True},
            {"field": msr("fact_market_potential","MS Units to Target"),   "queryRef": mref("fact_market_potential","MS Units to Target"),   "active": True},
        ]},
    },
    # PAGE 4 tables
    "cust-goal-seek-table": table_qs(
        ("Dim_Cust",             "Customer Name",              False),
        ("fact_market_potential","MS Realization Index",       True),
        ("fact_market_potential","Pot Realized Qty",           True),
        ("fact_market_potential","Pot Total Potential Units",  True),
        ("fact_market_potential","MS Units to Target",         True),
        ("fact_market_potential","MS Current vs Target Status",True),
    ),
    "cat-breakdown-table": table_qs(
        ("dim_terumo_category",  "terumo_category",            False),
        ("fact_market_potential","MS Realization Index",        True),
        ("fact_market_potential","MS Mix Index",                True),
        ("fact_market_potential","MS Units to Target",          True),
        ("fact_market_potential","MS Current vs Target Status", True),
    ),
}

# ── apply ─────────────────────────────────────────────────────────────────────
updated, skipped = 0, 0
for page_dir in os.listdir(PAGES):
    vis_root = os.path.join(PAGES, page_dir, "visuals")
    if not os.path.isdir(vis_root): continue
    for vis_dir in os.listdir(vis_root):
        vpath = os.path.join(vis_root, vis_dir, "visual.json")
        if not os.path.isfile(vpath): continue
        qs = BINDINGS.get(vis_dir)
        if qs is None:
            if "textbox" not in vis_dir and "Title" not in vis_dir:
                print(f"  UNMATCHED: {vis_dir}")
            skipped += 1
            continue
        with open(vpath, encoding="utf-8") as f: vdata = json.load(f)
        vdata["visual"]["query"]["queryState"] = qs
        vdata["visual"]["query"].pop("dataTransforms", None)
        vdata["visual"].pop("dataTransforms", None)
        with open(vpath, "w", encoding="utf-8") as f:
            json.dump(vdata, f, indent=2, ensure_ascii=False)
        updated += 1

print(f"Done: {updated} bound, {skipped} skipped.")
