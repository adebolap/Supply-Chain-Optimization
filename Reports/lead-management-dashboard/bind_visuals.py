"""
bind_visuals.py  — patches every visual.json with field/measure bindings.
Run once, then open the .pbip in Power BI Desktop.
"""
import json, os, re

PAGES = "C:/Users/adebo/Reports/lead-management-dashboard/LeadManagement.Report/definition/pages"

# ── helpers ────────────────────────────────────────────────────────────────
def col(entity, prop):
    return {"Column": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}

def msr(entity, prop):
    return {"Measure": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}

def cref(entity, prop):          return f"{entity}.{prop}"
def mref(entity, prop):          return f"Sum({entity}.{prop})"

def dtype(entity, prop, is_msr):
    if is_msr: return {"numeric": {}}
    if prop in ("CreatedDate","ConvertedDate","CloseDate","ActivityDate","LastActivityDate","LastModifiedDate"):
        return {"dateTime": {}}
    if prop in ("IsConverted","IsActive","IsClosed","IsWon","IsDeleted"):
        return {"boolean": {}}
    return {"text": {}}

def proj(entity, prop, is_msr):
    f = msr(entity, prop) if is_msr else col(entity, prop)
    r = mref(entity, prop) if is_msr else cref(entity, prop)
    return {"field": f, "queryRef": r, "active": True}, r

# ── binding builders ────────────────────────────────────────────────────────
def slicer_b(entity, prop, is_msr=False):
    p, qr = proj(entity, prop, is_msr)
    qs = {"Field": {"projections": [p]}}
    dt = {"selects": [{"displayName": prop, "queryRef": qr,
                        "roles": {"Field": 0}, "type": dtype(entity, prop, is_msr)}],
          "projectionOrdering": {"Field": [0]}}
    return qs, dt

def card_b(entity, prop, is_msr=True):
    p, qr = proj(entity, prop, is_msr)
    qs = {"Values": {"projections": [p]}}
    dt = {"selects": [{"displayName": prop, "queryRef": qr,
                        "roles": {"Values": 0}, "type": dtype(entity, prop, is_msr)}],
          "projectionOrdering": {"Values": [0]}}
    return qs, dt

def chart_b(cat_ent, cat_prop, y_ent, y_prop, y_is_msr=True,
            ser_ent=None, ser_prop=None):
    cp, cqr = proj(cat_ent, cat_prop, False)
    yp, yqr = proj(y_ent, y_prop, y_is_msr)
    qs = {"Category": {"projections": [cp]}, "Y": {"projections": [yp]}}
    sels = [
        {"displayName": cat_prop, "queryRef": cqr, "roles": {"Category": 0},
         "type": dtype(cat_ent, cat_prop, False)},
        {"displayName": y_prop,   "queryRef": yqr, "roles": {"Y": 0},
         "type": dtype(y_ent, y_prop, y_is_msr)},
    ]
    po = {"Category": [0], "Y": [1]}
    if ser_ent and ser_prop:
        sp, sqr = proj(ser_ent, ser_prop, False)
        qs["Series"] = {"projections": [sp]}
        sels.append({"displayName": ser_prop, "queryRef": sqr,
                     "roles": {"Series": 0}, "type": dtype(ser_ent, ser_prop, False)})
        po["Series"] = [2]
    return qs, {"selects": sels, "projectionOrdering": po}

def table_b(*fields):
    """fields: list of (entity, prop, is_msr)"""
    projs, sels = [], []
    po_vals = []
    for i, (ent, prop, is_msr) in enumerate(fields):
        p, qr = proj(ent, prop, is_msr)
        projs.append(p)
        sels.append({"displayName": prop, "queryRef": qr,
                     "roles": {"Values": i}, "type": dtype(ent, prop, is_msr)})
        po_vals.append(i)
    qs = {"Values": {"projections": projs}}
    dt = {"selects": sels, "projectionOrdering": {"Values": po_vals}}
    return qs, dt

def pivot_b(row_ent, row_prop, col_ent, col_prop, val_ent, val_prop):
    rp, rqr = proj(row_ent, row_prop, False)
    cp2, cqr2 = proj(col_ent, col_prop, False)
    vp, vqr  = proj(val_ent, val_prop, True)
    qs = {"Rows":    {"projections": [rp]},
          "Columns": {"projections": [cp2]},
          "Values":  {"projections": [vp]}}
    sels = [
        {"displayName": row_prop, "queryRef": rqr,  "roles": {"Rows": 0},    "type": {"text": {}}},
        {"displayName": col_prop, "queryRef": cqr2, "roles": {"Columns": 0}, "type": {"text": {}}},
        {"displayName": val_prop, "queryRef": vqr,  "roles": {"Values": 0},  "type": {"numeric": {}}},
    ]
    dt = {"selects": sels, "projectionOrdering": {"Rows": [0], "Columns": [1], "Values": [2]}}
    return qs, dt

def scatter_b(x_ent, x_prop, x_msr, y_ent, y_prop, y_msr, det_ent, det_prop):
    xp, xqr = proj(x_ent, x_prop, x_msr)
    yp, yqr = proj(y_ent, y_prop, y_msr)
    dp, dqr = proj(det_ent, det_prop, False)
    qs = {"X": {"projections": [xp]}, "Y": {"projections": [yp]},
          "Details": {"projections": [dp]}}
    sels = [
        {"displayName": x_prop, "queryRef": xqr, "roles": {"X": 0},       "type": {"numeric": {}}},
        {"displayName": y_prop, "queryRef": yqr, "roles": {"Y": 0},       "type": {"numeric": {}}},
        {"displayName": det_prop, "queryRef": dqr, "roles": {"Details": 0},"type": {"text": {}}},
    ]
    dt = {"selects": sels, "projectionOrdering": {"X": [0], "Y": [1], "Details": [2]}}
    return qs, dt

def treemap_b(grp_ent, grp_prop, val_ent, val_prop):
    gp, gqr = proj(grp_ent, grp_prop, False)
    vp, vqr = proj(val_ent, val_prop, True)
    qs = {"Group": {"projections": [gp]}, "Values": {"projections": [vp]}}
    sels = [
        {"displayName": grp_prop, "queryRef": gqr, "roles": {"Group": 0},  "type": {"text": {}}},
        {"displayName": val_prop, "queryRef": vqr, "roles": {"Values": 0}, "type": {"numeric": {}}},
    ]
    dt = {"selects": sels, "projectionOrdering": {"Group": [0], "Values": [1]}}
    return qs, dt

# ── pattern → binding map ────────────────────────────────────────────────────
# Each entry: (pattern_substring, (queryState, dataTransforms))
BINDINGS = [
    # — slicers —
    ("date-range-slicer",            slicer_b("Lead", "CreatedDate")),
    ("business-unit-slicer",         slicer_b("Lead", "TER_Department_Unit__c")),
    ("lead-source-slicer",           slicer_b("Lead", "TER_Source_Campaign__c")),
    ("lead-type-slicer",             slicer_b("Lead", "Status")),
    ("region-slicer",                slicer_b("Mapping", "TER_Region_Code__c")),
    ("country-cluster-slicer",       slicer_b("Mapping", "TER_Region_Code__c")),
    ("country-slicer",               slicer_b("Lead", "Country")),
    ("lead-nature-slicer",           slicer_b("Lead", "TER_Department_Unit__c")),
    ("bu-event-slicer",              slicer_b("Lead", "TER_Department_Unit__c")),
    ("sales-manager-slicer",         slicer_b("User", "Name")),
    ("sales-rep-slicer",             slicer_b("User", "Name")),
    ("business-line-slicer",         slicer_b("Opportunity", "TER_Business_Line__c")),

    # — cards —
    ("leads-assigned-cardVisual",     card_b("Lead", "% Leads Assigned to Reps")),
    ("leads-converted-cardVisual",    card_b("Lead", "Conversion Rate (All Leads)")),
    ("leads-followed-up-cardVisual",  card_b("Lead", "% Leads with Activity")),
    ("avg-lead-cycle-days-cardVisual",card_b("Lead", "Avg Lead Cycle Days (Total)")),
    ("leads-assigned-to-reps-cardVisual", card_b("Lead", "Leads Assigned to Reps")),
    ("leads-in-queue-cardVisual",     card_b("Lead", "Leads in Queue (New)")),
    ("leads-unqualified-cardVisual",  card_b("Lead", "Leads Unqualified")),
    ("avg-days-in-queue-cardVisual",  card_b("Lead", "Avg Days in Queue")),
    ("avg-full-cycle-days-cardVisual",card_b("Lead", "Avg Lead Cycle Days (Total)")),
    ("median-cycle-days-cardVisual",  card_b("Lead", "Median Lead Cycle Days")),
    ("avg-response-days-cardVisual",  card_b("Lead", "Avg Days in Queue")),
    ("total-opportunity-value-cardVisual", card_b("Opportunity", "Total Opportunity Value (Won)")),
    ("avg-value-per-lead-cardVisual", card_b("Opportunity", "Avg Opportunity Value per Converted Lead")),
    ("leads-with-opportunity-cardVisual", card_b("Lead", "Leads with Opportunity")),
    ("action-items-alerts-cardVisual",card_b("Task", "Total Task Count")),

    # — charts —
    ("lead-funnel-funnel",
        chart_b("Lead", "Status", "Lead", "Total Leads")),
    ("conversion-rate-trend-12-month-lineChart",
        chart_b("Lead", "CreatedDate", "Lead", "Conversion Rate (All Leads)")),
    ("top-performing-regions-clusteredBarChart",
        chart_b("Mapping", "TER_Region_Code__c", "Lead", "Total Leads")),
    ("assignment-by-event-stackedColumnChart",
        chart_b("Lead", "TER_Source_Campaign__c", "Lead", "Total Leads",
                True, "Lead", "Status")),
    ("queue-days-distribution-columnChart",
        chart_b("Lead", "Status", "Lead", "Avg Days in Queue")),
    ("working-vs-nurturing-split-stackedBarChart",
        chart_b("User", "Name", "Lead", "Leads Assigned to Reps",
                True, "Lead", "Status")),
    ("cycle-time-by-country-clusteredBarChart",
        chart_b("Lead", "Country", "Lead", "Avg Lead Cycle Days (Total)")),
    ("cycle-time-distribution-columnChart",
        chart_b("Lead", "Status", "Lead", "Avg Days in Queue")),
    ("cycle-time-trend-lineChart",
        chart_b("Lead", "CreatedDate", "Lead", "Avg Lead Cycle Days (Total)")),
    ("conversion-by-lead-type-funnel",
        chart_b("Lead", "Status", "Lead", "Total Leads")),
    ("conversion-by-nature-clusteredColumnChart",
        chart_b("Lead", "TER_Department_Unit__c", "Lead", "Conversion Rate (All Leads)")),
    ("followup-engagement-donutChart",
        chart_b("Task", "Type", "Task", "Total Task Count")),
    ("opportunity-creation-funnel-funnel",
        chart_b("Opportunity", "StageName", "Opportunity", "Total Opportunity Value (All)")),
    ("lead-score-history-lineChart",
        chart_b("Lead", "CreatedDate", "Lead", "TER_Marketo_Score__c", False)),

    # — treemap —
    ("roi-by-business-line-treemap",
        treemap_b("Opportunity", "TER_Business_Line__c", "Opportunity", "Revenue by Business Line")),

    # — scatter —
    ("campaign-roi-vs-conversion-scatterChart",
        scatter_b("Lead", "Total Leads", True,
                  "Opportunity", "Total Opportunity Value (Won)", True,
                  "Lead", "TER_Source_Campaign__c")),

    # — pivot —
    ("assignment-detail-by-manager-a-pivotTable",
        pivot_b("User", "Manager Name", "Lead", "Status", "Lead", "Total Leads")),

    # — tables —
    ("outlier-leads-over-30-days-tableEx",
        table_b(("Lead","Name",False), ("Lead","Country",False),
                ("User","Name",False), ("Lead","Avg Lead Cycle Days (Total)",True))),
    ("rep-performance-vs-team-averag-tableEx",
        table_b(("User","Name",False), ("Lead","Total Leads",True),
                ("Lead","Conversion Rate (All Leads)",True),
                ("Lead","% Leads with Activity",True))),
    ("attribution-by-campaign-tableEx",
        table_b(("Lead","TER_Source_Campaign__c",False), ("Lead","Total Leads",True),
                ("Lead","Leads Converted",True),
                ("Opportunity","Total Opportunity Value (Won)",True))),
    ("lead-detail-list-tableEx",
        table_b(("Lead","Name",False), ("Lead","Status",False),
                ("Lead","Country",False), ("User","Name",False),
                ("Lead","CreatedDate",False), ("Lead","Total Leads",True))),
]

# visuals to skip (textboxes with no data role)
SKIP_PATTERNS = ["textbox", "Title", "90cb5f99919c2c31"]

# ── main loop ────────────────────────────────────────────────────────────────
updated, skipped, unmatched = 0, 0, []

for page_dir in os.listdir(PAGES):
    vis_root = os.path.join(PAGES, page_dir, "visuals")
    if not os.path.isdir(vis_root):
        continue
    for vis_dir in os.listdir(vis_root):
        # skip textboxes
        if any(s in vis_dir for s in SKIP_PATTERNS):
            skipped += 1
            continue

        vpath = os.path.join(vis_root, vis_dir, "visual.json")
        if not os.path.isfile(vpath):
            continue

        with open(vpath, "r", encoding="utf-8") as f:
            vdata = json.load(f)

        # find matching binding
        matched = None
        for pattern, binding in BINDINGS:
            if pattern in vis_dir:
                matched = binding
                break

        if matched is None:
            unmatched.append(vis_dir)
            continue

        qs, dt = matched
        vdata["visual"]["query"]["queryState"] = qs
        # Remove any stale dataTransforms written by earlier runs
        vdata["visual"]["query"].pop("dataTransforms", None)
        vdata["visual"].pop("dataTransforms", None)

        with open(vpath, "w", encoding="utf-8") as f:
            json.dump(vdata, f, indent=2, ensure_ascii=False)

        updated += 1
        print(f"  OK  {vis_dir}")

print(f"\nDone — {updated} updated, {skipped} skipped (textboxes)")
if unmatched:
    print(f"Unmatched ({len(unmatched)}):")
    for u in unmatched: print(f"  ? {u}")
