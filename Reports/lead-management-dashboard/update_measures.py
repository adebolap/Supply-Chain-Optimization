"""
update_measures.py — syncs model.bim measures to MOCKUP_DAX_Measures_CORRECTED.dax
Changes:
  - 4 measure renames + corrected expressions
  - Adds KPI Title string measures to Lead table
  - Keeps all existing measures not in the corrected file
"""
import json, copy

BIM = "C:/Users/adebo/Reports/lead-management-dashboard/LeadManagement.SemanticModel/model.bim"

# ── corrected expressions ────────────────────────────────────────────────────
LEAD_FIXES = {
    "Total Leads": (
        "Total Leads",
        'CALCULATE(COUNTROWS(Lead), Lead[IsDeleted] = FALSE, ISBLANK(Lead[MasterRecordId]))'
    ),
    "Leads Converted": (
        "Leads Converted",
        "CALCULATE(COUNTROWS(Lead), Lead[IsConverted] = TRUE, Lead[IsDeleted] = FALSE)"
    ),
    "Leads Not Converted": (
        "Leads Not Converted",
        "CALCULATE(COUNTROWS(Lead), Lead[IsConverted] = FALSE, Lead[IsDeleted] = FALSE)"
    ),
    "Leads Assigned to Reps": (
        "Leads Assigned to Reps",
        'CALCULATE(COUNTROWS(Lead), Lead[Status] IN {"Working","Nurturing"}, Lead[IsDeleted] = FALSE)'
    ),
    "Leads in Queue (New)": (
        "Leads in Queue (New)",
        'CALCULATE(COUNTROWS(Lead), Lead[Status] = "New", Lead[IsDeleted] = FALSE)'
    ),
    "Leads Unqualified": (
        "Leads Unqualified",
        'CALCULATE(COUNTROWS(Lead), Lead[Status] = "Unqualified", Lead[IsDeleted] = FALSE)'
    ),
    "% Leads Assigned to Reps": (
        "% Leads Assigned to Reps",
        "DIVIDE([Leads Assigned to Reps],[Total Leads],0)"
    ),
    "% Leads in Queue": (
        "% Leads in Queue",
        "DIVIDE([Leads in Queue (New)],[Total Leads],0)"
    ),
    "% Leads Unqualified": (
        "% Leads Unqualified",
        "DIVIDE([Leads Unqualified],[Total Leads],0)"
    ),
    "Avg Days in Queue": (
        "Avg Days in Queue",
        'AVERAGEX(FILTER(\'Lead\',\'Lead\'[Status] IN {"Working","Nurturing","Converted"} && NOT(ISBLANK(\'Lead\'[LastModifiedDate])) && \'Lead\'[IsDeleted] = FALSE),DATEDIFF(\'Lead\'[CreatedDate],\'Lead\'[LastModifiedDate],DAY))'
    ),
    "Median Days in Queue": (
        "Median Days in Queue",
        'MEDIANX(FILTER(\'Lead\',\'Lead\'[Status] IN {"Working","Nurturing","Converted"} && NOT(ISBLANK(\'Lead\'[LastModifiedDate])) && \'Lead\'[IsDeleted] = FALSE),DATEDIFF(\'Lead\'[CreatedDate],\'Lead\'[LastModifiedDate],DAY))'
    ),
    "Conversion Rate (All Leads)": (
        "Conversion Rate (All Leads)",
        "DIVIDE([Leads Converted],[Total Leads],0)"
    ),
    "Conversion Rate (Assigned Leads)": (
        "Conversion Rate (Assigned Leads)",
        "DIVIDE([Leads Converted],[Leads Assigned to Reps]+[Leads Converted],0)"
    ),
    # ── RENAME: Leads with Activity → Leads with Activity (Last Activity Date)
    "Leads with Activity": (
        "Leads with Activity (Last Activity Date)",
        "COUNTROWS(FILTER('Lead',NOT(ISBLANK('Lead'[LastActivityDate])) && 'Lead'[IsDeleted] = FALSE))"
    ),
    "% Leads with Activity": (
        "% Leads with Activity",
        "DIVIDE([Leads with Activity (Last Activity Date)],[Total Leads],0)"
    ),
    "Leads with Opportunity": (
        "Leads with Opportunity",
        "COUNTROWS(FILTER('Lead',NOT(ISBLANK('Lead'[ConvertedOpportunityId])) && 'Lead'[IsDeleted] = FALSE))"
    ),
    # ── RENAME: % Converted with Opportunity → % Converted Leads with Opportunity
    "% Converted with Opportunity": (
        "% Converted Leads with Opportunity",
        "DIVIDE([Leads with Opportunity],[Leads Converted],0)"
    ),
    # ── RENAME: Avg Lead Cycle Days → Avg Lead Cycle Days (Total)
    "Avg Lead Cycle Days": (
        "Avg Lead Cycle Days (Total)",
        "AVERAGEX(FILTER('Lead','Lead'[IsConverted]=TRUE && NOT(ISBLANK('Lead'[ConvertedDate])) && 'Lead'[IsDeleted]=FALSE),DATEDIFF('Lead'[CreatedDate],'Lead'[ConvertedDate],DAY))"
    ),
    "Median Lead Cycle Days": (
        "Median Lead Cycle Days",
        "MEDIANX(FILTER('Lead','Lead'[IsConverted]=TRUE && NOT(ISBLANK('Lead'[ConvertedDate])) && 'Lead'[IsDeleted]=FALSE),DATEDIFF('Lead'[CreatedDate],'Lead'[ConvertedDate],DAY))"
    ),
    "Min Lead Cycle Days": (
        "Min Lead Cycle Days",
        "MINX(FILTER('Lead','Lead'[IsConverted]=TRUE && NOT(ISBLANK('Lead'[ConvertedDate])) && 'Lead'[IsDeleted]=FALSE),DATEDIFF('Lead'[CreatedDate],'Lead'[ConvertedDate],DAY))"
    ),
    "Max Lead Cycle Days": (
        "Max Lead Cycle Days",
        "MAXX(FILTER('Lead','Lead'[IsConverted]=TRUE && NOT(ISBLANK('Lead'[ConvertedDate])) && 'Lead'[IsDeleted]=FALSE),DATEDIFF('Lead'[CreatedDate],'Lead'[ConvertedDate],DAY))"
    ),
    "Leads by Country": (
        "Leads by Country",
        "CALCULATE([Total Leads],ALLEXCEPT('Lead','Lead'[Country]))"
    ),
    "Leads by Cluster": (
        "Leads by Cluster",
        "CALCULATE([Total Leads],ALLEXCEPT('Mapping','Mapping'[TER_Region_Code__c]))"
    ),
    "Leads by Owner": (
        "Leads by Owner",
        "CALCULATE([Total Leads],ALLEXCEPT('User','User'[Name]))"
    ),
    "Leads by Campaign Source": (
        "Leads by Campaign Source",
        "CALCULATE([Total Leads],ALLEXCEPT('Lead','Lead'[TER_Source_Campaign__c]))"
    ),
    "Leads Created This Month": (
        "Leads Created This Month",
        "CALCULATE([Total Leads],MONTH('Lead'[CreatedDate])=MONTH(TODAY()),YEAR('Lead'[CreatedDate])=YEAR(TODAY()))"
    ),
    "Leads Converted This Month": (
        "Leads Converted This Month",
        "CALCULATE([Leads Converted],MONTH('Lead'[ConvertedDate])=MONTH(TODAY()),YEAR('Lead'[ConvertedDate])=YEAR(TODAY()))"
    ),
    "TEST - Lead Owner Names": (
        "TEST - Lead Owner Names",
        "CONCATENATEX(VALUES('Lead'[OwnerId]),RELATED('User'[Name]),\", \",'User'[Name],ASC)"
    ),
    "TEST - Country Cluster Mapping": (
        "TEST - Country Cluster Mapping",
        "CONCATENATEX(VALUES('Lead'[Country]),RELATED('Mapping'[TER_Region_Code__c]),\", \",'Mapping'[TER_Region_Code__c],ASC)"
    ),
    "TEST - Converted with Opps": (
        "TEST - Converted with Opps",
        "COUNTROWS(FILTER('Lead','Lead'[IsConverted]=TRUE && NOT(ISBLANK(RELATED('Opportunity'[Id])))))"
    ),
}

OPP_FIXES = {
    "Total Opportunity Value (Won)": (
        "Total Opportunity Value (Won)",
        "CALCULATE(SUM('Opportunity'[Amount]),'Opportunity'[IsWon]=TRUE,'Opportunity'[IsDeleted]=FALSE)"
    ),
    "Total Opportunity Value (All)": (
        "Total Opportunity Value (All)",
        "CALCULATE(SUM('Opportunity'[Amount]),'Opportunity'[IsDeleted]=FALSE)"
    ),
    "Opportunity Count (Won)": (
        "Opportunity Count (Won)",
        "COUNTROWS(FILTER('Opportunity','Opportunity'[IsWon]=TRUE && 'Opportunity'[IsDeleted]=FALSE))"
    ),
    "Opportunity Count (All)": (
        "Opportunity Count (All)",
        "COUNTROWS(FILTER('Opportunity','Opportunity'[IsDeleted]=FALSE))"
    ),
    "Avg Opportunity Value": (
        "Avg Opportunity Value",
        "DIVIDE([Total Opportunity Value (Won)],[Opportunity Count (Won)],0)"
    ),
    # ── RENAME: Avg Value per Converted Lead → Avg Opportunity Value per Converted Lead
    "Avg Value per Converted Lead": (
        "Avg Opportunity Value per Converted Lead",
        "DIVIDE([Total Opportunity Value (Won)],[Leads with Opportunity],0)"
    ),
    "Win Rate (Opportunities)": (
        "Win Rate (Opportunities)",
        "DIVIDE([Opportunity Count (Won)],[Opportunity Count (All)],0)"
    ),
    "Revenue by Business Line": (
        "Revenue by Business Line",
        "CALCULATE([Total Opportunity Value (Won)],ALLEXCEPT('Opportunity','Opportunity'[TER_Business_Line__c]))"
    ),
    "Revenue by Campaign Source": (
        "Revenue by Campaign Source",
        "CALCULATE([Total Opportunity Value (Won)],ALLEXCEPT('Opportunity','Opportunity'[LeadSource]))"
    ),
    "Revenue by Country": (
        "Revenue by Country",
        "CALCULATE([Total Opportunity Value (Won)],ALLEXCEPT('Opportunity','Opportunity'[TER_Country__c]))"
    ),
    "Revenue by Owner": (
        "Revenue by Owner",
        "CALCULATE([Total Opportunity Value (Won)],ALLEXCEPT('User','User'[Name]))"
    ),
    "Opportunities by Stage": (
        "Opportunities by Stage",
        "CALCULATE(COUNTROWS('Opportunity'),ALLEXCEPT('Opportunity','Opportunity'[StageName]))"
    ),
    "Revenue by Stage": (
        "Revenue by Stage",
        "CALCULATE(SUM('Opportunity'[Amount]),ALLEXCEPT('Opportunity','Opportunity'[StageName]))"
    ),
    "Opportunities by Business Line": (
        "Opportunities by Business Line",
        "CALCULATE([Opportunity Count (Won)],ALLEXCEPT('Opportunity','Opportunity'[TER_Business_Line__c]))"
    ),
    "TEST - Leads with Tasks Count": (
        "TEST - Leads with Tasks Count",
        "DISTINCTCOUNT('Task'[WhoId])"
    ),
}

TASK_FIXES = {
    "Leads with Task Activity": (
        "Leads with Task Activity",
        "DISTINCTCOUNT('Task'[WhoId])"
    ),
    "Total Task Count": (
        "Total Task Count",
        "COUNTROWS('Task')"
    ),
    "Avg Tasks per Lead": (
        "Avg Tasks per Lead",
        "DIVIDE([Total Task Count],[Leads with Task Activity],0)"
    ),
    "Tasks Completed": (
        "Tasks Completed",
        "COUNTROWS(FILTER('Task','Task'[IsClosed]=TRUE))"
    ),
    "Task Completion Rate": (
        "Task Completion Rate",
        "DIVIDE([Tasks Completed],[Total Task Count],0)"
    ),
}

# KPI Title measures to ADD to Lead table
KPI_TITLES = [
    {"name": "KPI 1 Title", "expression": '"Lead Assignment"',    "displayFolder": "6. KPI Titles"},
    {"name": "KPI 2 Title", "expression": '"Assignment Cycle"',   "displayFolder": "6. KPI Titles"},
    {"name": "KPI 3 Title", "expression": '"Lead Conversion"',    "displayFolder": "6. KPI Titles"},
    {"name": "KPI 4 Title", "expression": '"Lead Follow-up"',     "displayFolder": "6. KPI Titles"},
    {"name": "KPI 5 Title", "expression": '"Full Lead Cycle"',    "displayFolder": "6. KPI Titles"},
    {"name": "KPI 6 Title", "expression": '"Attributed ROI"',     "displayFolder": "6. KPI Titles"},
]

TABLE_FIXES = {"Lead": LEAD_FIXES, "Opportunity": OPP_FIXES, "Task": TASK_FIXES}

# ── apply ────────────────────────────────────────────────────────────────────
with open(BIM) as f:
    m = json.load(f)

renamed, updated, added = [], [], []

for table in m["model"]["tables"]:
    tname = table["name"]
    fixes = TABLE_FIXES.get(tname, {})
    for msr in table.get("measures", []):
        old_name = msr["name"]
        if old_name in fixes:
            new_name, new_expr = fixes[old_name]
            if new_name != old_name:
                renamed.append(f"{old_name} -> {new_name}")
            msr["name"] = new_name
            msr["expression"] = new_expr
            updated.append(new_name)

    # Add KPI Title measures to Lead table (skip if already exist)
    if tname == "Lead":
        existing = {x["name"] for x in table.get("measures", [])}
        for kpi in KPI_TITLES:
            if kpi["name"] not in existing:
                table.setdefault("measures", []).append(kpi)
                added.append(kpi["name"])

with open(BIM, "w") as f:
    json.dump(m, f, indent=2, ensure_ascii=False)

print(f"Updated {len(updated)} measures")
print(f"Renamed: {renamed}")
print(f"Added: {added}")
