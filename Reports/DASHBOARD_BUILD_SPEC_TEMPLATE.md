# Power BI Dashboard Build Spec
# Feed this completed document to AI to build a full dashboard from scratch.
# Fields marked [REQUIRED] must be filled. [OPTIONAL] can be left blank.
# ─────────────────────────────────────────────────────────────────────────────

---

## 1. PROJECT BASICS  [REQUIRED]

| Field | Your Answer |
|---|---|
| Dashboard name | e.g. Sales Performance Dashboard |
| Save path (Windows) | e.g. C:\Users\yourname\Reports\sales-dashboard |
| Canvas size | 1920x1080 (default) / 1280x720 / custom: ___x___ |
| Power BI Desktop version | e.g. March 2026 |
| Number of pages | e.g. 4 |

---

## 2. SEMANTIC MODEL  [REQUIRED — choose one]

### Option A — Provide existing model.bim path
```
Path: C:\path\to\your\model.bim
```

### Option B — Paste measure list
Paste the output of this Python snippet run against your model.bim:
```python
import json
with open("model.bim") as f: m = json.load(f)
for t in m["model"]["tables"]:
    msrs = [x["name"] for x in t.get("measures", [])]
    cols = [x["name"] for x in t.get("columns", []) if x.get("type") != "calculated"]
    print(f"\n=== TABLE: {t['name']} ===")
    print(f"COLUMNS : {cols}")
    print(f"MEASURES: {msrs}")
```
```
# Paste output here:

```

### Option C — Describe tables & measures in plain language
```
Table: Lead
  Columns : Id, Name, Status, Country, OwnerId, CreatedDate, IsConverted...
  Measures: Total Leads, Conversion Rate, Avg Cycle Days...

Table: Opportunity
  Columns : Id, Amount, StageName, OwnerId, TER_Business_Line__c...
  Measures: Total Revenue, Win Rate...
```

---

## 3. DATA SOURCE  [REQUIRED]

| Field | Your Answer |
|---|---|
| Current data source | CSV files / Excel / Salesforce / SQL Server / Fabric / Other |
| CSV folder path (if CSV) | e.g. C:\Users\yourname\Reports\dashboard\data |
| Go-live source (if known) | e.g. Salesforce Production, SQL Server on AzureSQL |
| Salesforce login URL (if SF) | https://login.salesforce.com OR https://yourorg.my.salesforce.com |
| Salesforce API version (if SF) | e.g. 59.0 |

---

## 4. PAGES  [REQUIRED]

List each page. Copy the block for as many pages as needed.

### Page 1
| Field | Your Answer |
|---|---|
| Page display name | e.g. Executive Summary |
| Purpose (1 sentence) | e.g. High-level KPIs and trends for leadership |
| Primary audience | e.g. C-Suite / Sales Managers / Analysts |
| Is this a drill-through page? | Yes / No |

### Page 2
| Field | Your Answer |
|---|---|
| Page display name | |
| Purpose (1 sentence) | |
| Primary audience | |
| Is this a drill-through page? | Yes / No |

### Page 3
| Field | Your Answer |
|---|---|
| Page display name | |
| Purpose | |
| Primary audience | |
| Is this a drill-through page? | Yes / No |

### Page 4
| Field | Your Answer |
|---|---|
| Page display name | |
| Purpose | |
| Primary audience | |
| Is this a drill-through page? | Yes / No |

*(add more Page blocks as needed)*

---

## 5. SLICERS — Global Filters  [REQUIRED]

List every slicer/filter that should appear on the dashboard.
Mark which pages each slicer appears on (All = every page).

| Slicer Label | Table | Column/Field | Pages | Style |
|---|---|---|---|---|
| e.g. Date Range | Lead | CreatedDate | All | Between (date range) |
| e.g. Region | Mapping | TER_Region_Code__c | All | Dropdown |
| e.g. Business Unit | Lead | TER_Department_Unit__c | All | Dropdown |
| e.g. Sales Manager | User | Name | Pages 2,3 | Dropdown |
| | | | | |
| | | | | |
| | | | | |

Slicer Style options: `Dropdown` / `List` / `Between` (dates) / `Tile` / `Search`

---

## 6. KPI CARDS  [REQUIRED]

One row per card. Mark which page each card lives on.

| Card Title | Measure | Table | Page | Format |
|---|---|---|---|---|
| e.g. Total Leads | Total Leads | Lead | 1 | Number (0 decimal) |
| e.g. Conversion Rate | Conversion Rate (All Leads) | Lead | 1 | Percentage (1 dp) |
| e.g. Avg Cycle Days | Avg Lead Cycle Days (Total) | Lead | 1 | Number (1 dp) |
| e.g. Total Revenue | Total Opportunity Value (Won) | Opportunity | 1 | Currency ($) |
| | | | | |
| | | | | |
| | | | | |

Format options: `Number` / `Percentage` / `Currency` / `Days` / `Text`

---

## 7. CHARTS  [REQUIRED]

One row per chart visual. For Series column — leave blank if not needed.

| Chart Title | Visual Type | Category (X-axis) Table.Column | Y-axis Measure | Series (Legend) | Page |
|---|---|---|---|---|---|
| e.g. Lead Funnel | funnel | Lead.Status | Total Leads | — | 1 |
| e.g. Conversion Trend | lineChart | Lead.CreatedDate | Conversion Rate (All Leads) | — | 1 |
| e.g. Revenue by Region | clusteredBarChart | Mapping.TER_Region_Code__c | Total Opportunity Value (Won) | — | 1 |
| e.g. Assignment Split | stackedColumnChart | Lead.TER_Source_Campaign__c | Total Leads | Lead.Status | 2 |
| e.g. Rep Performance | scatterChart | *see note | Total Leads | User.Name | 3 |
| | | | | | |
| | | | | | |

Visual Type options:
`lineChart` / `clusteredBarChart` / `clusteredColumnChart` / `stackedBarChart`
`stackedColumnChart` / `funnel` / `donutChart` / `treemap` / `scatterChart`
`areaChart` / `ribbonChart` / `waterfallChart`

*scatterChart note: provide X measure, Y measure, and Details column separately in notes below.

---

## 8. TABLES & MATRICES  [REQUIRED if any]

| Table Title | Visual Type | Columns/Rows to Show | Page |
|---|---|---|---|
| e.g. Lead Detail List | tableEx | Lead.Name, Lead.Status, Lead.Country, User.Name, Lead.CreatedDate, Lead[Total Leads] | 6 |
| e.g. Rep vs Team Avg | tableEx | User.Name, Lead[Total Leads], Lead[Conversion Rate], Lead[% Leads with Activity] | 3 |
| e.g. Manager × Status | pivotTable | Rows: User[Manager Name] / Cols: Lead.Status / Values: Lead[Total Leads] | 2 |
| | | | |

---

## 9. BRANDING & THEME  [OPTIONAL — defaults used if blank]

| Field | Your Answer |
|---|---|
| Primary colour (hex) | e.g. #0078D4 |
| Secondary / accent colour | e.g. #107C10 |
| Negative / bad colour | e.g. #D13438 |
| Neutral colour | e.g. #605E5C |
| Extra data colours (comma-separated hex) | e.g. #FFB900, #00B4D8, #5A189A |
| Font family | e.g. Segoe UI (Power BI default) |
| Dashboard title text | e.g. Lead Management Dashboard |
| Company / org name | e.g. Terumo |
| Logo path (if any) | e.g. C:\Users\...\logo.png |
| Base theme | SQLBI (default) / Microsoft / Custom |

---

## 10. RELATIONSHIPS  [OPTIONAL — only if not in model.bim]

List any relationships NOT already in model.bim that need to be created.

| From Table | From Column | To Table | To Column | Active? | Direction |
|---|---|---|---|---|---|
| e.g. Lead | OwnerId | User | Id | Yes | Single |
| e.g. Opportunity | OwnerId | User | Id | No (inactive) | Single |
| | | | | | |

**Self-join warning**: Power BI does NOT support a table joining to itself.
Use a LOOKUPVALUE calculated column instead (see knowledge base).

---

## 11. SPECIAL VISUALS  [OPTIONAL]

Describe anything not covered above:
```
e.g. Page 4 needs a scatter chart where:
  X-axis  = Lead[Total Leads]
  Y-axis  = Opportunity[Total Opportunity Value (Won)]
  Details = Lead[TER_Source_Campaign__c]
  Size    = (none)

e.g. Page 6 needs a drill-through page:
  Drill field = Lead[Name]
  Visuals on drill page = Lead detail table + activity timeline textbox + score line chart
```

---

## 12. DRILL-THROUGH CONFIGURATION  [OPTIONAL]

| Drill-through page name | Field that triggers drill | Source pages |
|---|---|---|
| e.g. Lead Detail | Lead.Name | All pages |
| | | |

---

## 13. FORMATTING PREFERENCES  [OPTIONAL]

| Preference | Your Answer |
|---|---|
| Show visual borders? | Yes / No |
| Show visual titles? | Yes / No (default Yes) |
| Show gridlines on charts? | Yes / No |
| Card visual style | New card / Old card |
| Slicer style | Vertical / Horizontal |
| Date slicer default | Relative (Last 12 months) / Between / All |
| Page navigation buttons? | Yes / No |

---

## 14. NOTES / ANYTHING ELSE  [OPTIONAL]

```
Free text — describe any special requirements, layout preferences,
data quirks, calculated columns needed, or context the AI should know.

e.g. The TER_Marketo_Score__c field only exists for leads after Jan 2024.
e.g. "Working" and "Nurturing" statuses both mean the lead is assigned.
e.g. Page 5 layout should mirror the attached screenshot.
```

---

## CHECKLIST — before submitting to AI

- [ ] Section 1 (Project basics) filled
- [ ] Section 2 (Model) — measure list pasted OR model.bim path provided
- [ ] Section 3 (Data source) filled
- [ ] Section 4 (Pages) — one block per page
- [ ] Section 5 (Slicers) — all filters listed
- [ ] Section 6 (KPI Cards) — all cards listed with measure names
- [ ] Section 7 (Charts) — all charts listed with correct visual types
- [ ] Section 8 (Tables) — any table/matrix visuals listed
- [ ] Sections 9–14 — fill as needed

---
# END OF SPEC
# Save this file and share it with the AI prompt:
# "Build this Power BI dashboard: [paste file content]"
