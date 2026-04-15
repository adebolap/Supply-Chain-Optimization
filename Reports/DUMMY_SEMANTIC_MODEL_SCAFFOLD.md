# Dummy SemanticModel Scaffold — Knowledge Base
# For offline / transfer-safe Power BI PBIP projects
# Updated: April 2026 (v2 — pbir CLI patterns, CF recipes, token efficiency)

## Goal
Build a `PBIP` report that opens in Power BI Desktop even when the real semantic
model is not available yet.

This pattern is for:
- offline visual development
- handoff to another laptop
- report-first builds where the model will be swapped in later

## What finally worked

### Required project shape
```text
MyProject/
├── MyReport.pbip
├── MyReport.Report/
│   ├── definition.pbir
│   └── definition/
│       └── pages/...
└── MyReport.SemanticModel/
    ├── model.bim
    ├── definition.bim
    ├── definition.pbism
    ├── .platform
    └── definition/
        └── definition.pbism
```

### Important schema rules
- The `.pbip` file should contain only the `report` artifact for this dummy setup.
- `definition.pbir` must reference the semantic model by path.
- Use `TMSL` `.bim` only, or `TMDL` only, but never both in the same PBIP.
- Page `page.json` files must not include unsupported properties like `ordinal`.

### Minimal `definition.pbir`
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  "version": "4.0",
  "datasetReference": {
    "byPath": {
      "path": "../MyReport.SemanticModel"
    }
  }
}
```

### Minimal semantic model metadata

`MyReport.SemanticModel/definition.pbism`
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
  "version": "4.2",
  "settings": {}
}
```

`MyReport.SemanticModel/.platform`
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  "metadata": {
    "type": "SemanticModel",
    "displayName": "MyReport",
    "description": "Dummy semantic model used to keep the PBIP portable before the real model is attached."
  },
  "config": {
    "version": "2.0",
    "logicalId": "GENERATE-A-NEW-GUID"
  }
}
```

## Dummy model rules that matter

### 1. Every table needs a real partition
Power BI Desktop rejected tables without a Full DataView partition.

Working pattern:
- one import partition per table
- `source.type = "m"`
- expression returns an empty typed table
- optional sample rows can be added inside the same `#table(...)` expression for demo visuals

Working M pattern:
```m
let
    Source = #table(
        {
            "Column A",
            "Column B"
        },
        {}
    ),
    Typed = Table.TransformColumnTypes(
        Source,
        {
            {"Column A", type text},
            {"Column B", Int64.Type}
        }
    )
in
    Typed
```

Type mapping that worked:
- `string` -> `type text`
- `double` -> `type number`
- `int64` -> `Int64.Type`
- `dateTime` -> `type datetime`
- `boolean` -> `type logical`

### 2. Avoid mixed semantic model formats
If `model.bim` exists, do not also keep `definition/database.tmdl`.

Observed error:
- "You cannot have both TMDL and TMSL formats in the same PBIP"

Fix:
- keep `model.bim`
- keep `definition.bim`
- keep `definition.pbism`
- remove `definition/database.tmdl`

### 3. Avoid mixed metadata formats
Observed error:
- "You cannot have both '.platform' and 'item.metadata.json' formats"

Fix:
- use `.platform`
- remove `item.metadata.json`
- if you generate `.platform`, give it a unique `logicalId`

### 4. Keep relationships simple
Dummy models are only there to let the report open, so relationship realism is
less important than model validity.

Avoid:
- ambiguous filter paths
- unnecessary bridge relationships
- self-referencing relationships
- many bidirectional relationships

Best practice:
- keep only the minimum relationships needed for report authoring
- prefer single-direction relationships
- if a dummy relationship is not needed for layout work, remove it

### 5. Page JSON must stay schema-clean
Observed error:
- `Property 'ordinal' has not been defined`

Fix:
- remove `ordinal` from `page.json`

## Error log from the Market Share recovery

| Error | Root cause | Fix |
|---|---|---|
| `semanticModel has not been defined` in `.pbip` | Tried adding unsupported `semanticModel` artifact | Keep `.pbip` as report-only |
| `both TMDL and TMSL formats` | `model.bim` and `database.tmdl` coexisted | Remove `database.tmdl` |
| `both '.platform' and 'item.metadata.json' formats` | New metadata format conflicted with legacy metadata file | Keep `.platform`, remove `item.metadata.json` |
| `Property 'ordinal' has not been defined` | Unsupported property in `page.json` | Remove `ordinal` |
| `Every table must contain at least one partition in the Full DataView` | Dummy tables had no usable partitions | Add import partitions with empty typed M tables |
| `Token ',' expected` from M engine | Partition M expression was malformed | Use valid `#table(...)` plus `Table.TransformColumnTypes(...)` |
| `ambiguous paths between ...` | Extra relationships created multiple filter routes | Remove unnecessary joins and keep the model minimal |

## Reusable generator pattern

For a working example, use:
- [Create-DummySemanticModel.ps1](C:\Users\adebo\reports\market-share-dashboard\scripts\Create-DummySemanticModel.ps1)

That script shows a reliable way to:
- define tables and measures in PowerShell
- generate empty typed M partitions for every table
- optionally inject sample rows that preserve key relationships
- write `model.bim`, `definition.bim`, `definition.pbism`, and metadata
- avoid recreating invalid mixed-format artifacts

### Recommended workflow
1. Build the report folder and visuals first.
2. Point `definition.pbir` to `../MyReport.SemanticModel`.
3. Generate the dummy model files.
4. Open in Power BI Desktop and fix the next strict schema/model error.
5. Repeat until Desktop opens cleanly.
6. Only then continue visual authoring.

## Transfer-safe guidance

To keep later rebinding easy:
- preserve table names
- preserve column names
- preserve measure names
- avoid renaming semantic objects after visuals are bound

Later you can:
- replace the dummy `model.bim` with the real one, or
- rebind the report to a production semantic model

## Notes for future dummy builds
- Treat Desktop as the validator of truth; PBIP schema issues usually surface one at a time.
- A tiny valid model is better than a realistic invalid one.
- If the report only needs to open, remove questionable relationships before trying to perfect them.

---

## pbir CLI — Confirmed Working Patterns (April 2026)

### pbir executable path (adebo machine)
```
C:/Users/adebo/AppData/Roaming/Python/Python312/Scripts/pbir.exe
```
Always run from the report's parent directory (not from the report folder itself):
```bash
cd /c/Users/adebo/Reports/market-share-dashboard
pbir.exe -q validate "MarketShare.Report"
```
Glob patterns only work with relative paths. Absolute paths break glob (`/**/*.Visual`).

### Field binding — only queryState, never dataTransforms
PBIR 2.7.0 rejects `dataTransforms` at every level. Only valid binding location:
```json
{ "visual": { "query": { "queryState": { "Values": { ... } } } } }
```
If stale dataTransforms exist, pop them from both `visual` and `visual.query` before writing.

### Visual folder names must be 16-char lowercase hex
Non-hex names (e.g. `cat-slicer`) produce `UserWarning` validation errors.
Generate with: `import secrets; secrets.token_hex(8)`

### Role key names by visual type
| Visual type | Role keys |
|---|---|
| `cardVisual` | `Values` |
| `slicer` | `Field` |
| `clusteredBarChart` / `stackedBarChart` | `Category`, `Y` |
| `scatterChart` | `X`, `Y`, `Size`, `Details`, `Legend` |
| `tableEx` | `Values` |
| `pivotTable` | `Rows`, `Columns`, `Values` |
| `treemap` | `Group`, `Values` |

### Page wallpaper (background fill)
```bash
pbir -q pages wallpaper "Report.Report/Page.Page" --color "#F7F7F5"
```

### Hide all visual headers (glob requires -f)
```bash
pbir -q set "Report.Report/**/*.Visual.visualHeader.show" --value false -f
```

### Visual backgrounds (no -f flag on this command)
```bash
# Per page glob works:
pbir -q visuals background "Report.Report/Page.Page/**/*.Visual" --color "#FFFFFF" --transparency 0
```

### Visual titles (glob works)
```bash
pbir -q visuals title "Report.Report/**/*.Visual" --show --fontSize 11 --fontColor "#475569" --bold
```

### Validation
```bash
pbir -q validate "Report.Report"            # Structure + schema only
pbir -q validate "Report.Report" --all      # Including field checks
```
`RENDER_REQUIRED_ROLE_MISSING` warnings = expected with stub model. Not blocking.

---

## CF (Conditional Formatting) — Confirmed Patterns

### Supported CF targets (confirmed via schema describe)
| Visual type | Container | Property | Use case |
|---|---|---|---|
| `clusteredBarChart` | `dataPoint` | `fill` | Bar colors by measure value |
| `stackedBarChart` | `dataPoint` | `fill` | Bar colors by measure value |
| `cardVisual` | `background` | `color` | Card background (badge CF) |
| `cardVisual` | `label` | `fontColor` | Card text color (badge CF) |

### Step 1 — Add color-returning extension measures
```bash
pbir -q dax measures add "Report.Report" \
  -t "fact_market_potential" \
  -n "_CF Bar Color" \
  -d Text \
  -e 'SWITCH(TRUE(), [Measure] >= 150, "#1D9E75", [Measure] >= 100, "#5DCAA5", [Measure] >= 50, "#EF9F27", "#E24B4A")' \
  --no-validate
```
- `-t` must be an existing model table
- `-d Text` is required for hex color strings
- `--no-validate` skips model connection check (fine for stub models)
- Extension measures live in `reportExtensions.json`, not in model.bim

### Step 2 — Apply CF using the extension measure
```bash
# Bar chart bar color
pbir -q visuals cf "Report.Report/Page.Page/Visual.Visual" \
  --measure "dataPoint.fill table_name._CF Bar Color"

# Card background
pbir -q visuals cf "Report.Report/Page.Page/Visual.Visual" \
  --measure "background.color table_name._CF Badge BG"

# Card text color
pbir -q visuals cf "Report.Report/Page.Page/Visual.Visual" \
  --measure "label.fontColor table_name._CF Badge Text"
```
Format: `"container.property TableName.MeasureName"`

### Standard CF color palette (Terumo / traffic light)
| Threshold | Color | Semantic |
|---|---|---|
| >= 150 / >= 50% | `#1D9E75` | Champion / green |
| >= 100 / >= 30% | `#5DCAA5` | Above average / teal |
| >= 50 / >= 15% | `#EF9F27` | Below average / amber |
| < 50 / < 15% | `#E24B4A` | Growth target / red |

### Badge CF color table (text-match)
| Badge value | Background | Text |
|---|---|---|
| Champion / Protect | `#EAF3DE` | `#27500A` |
| Above average / Maintain | `#E1F5EE` | `#085041` |
| Below average / Monitor | `#FAEEDA` | `#633806` |
| Growth target / Grow | `#FCEBEB` | `#791F1F` |

---

## Token Efficiency — Rules for Future Dashboard Builds

The biggest token sinks in past builds:
1. Trial-and-error on field binding syntax (dataTransforms, role key names)
2. Running `--help` repeatedly to discover command syntax
3. Iterative validate → fix → validate cycles
4. Discovering schema containers/properties interactively

### Rules to follow from session start

**Rule 1 — Spec first, build second**
Feed the complete `DASHBOARD_BUILD_SPEC_TEMPLATE.md` filled spec before writing any code.
The spec must include:
- Exact measure names (copy from model.bim, not paraphrased)
- CF rules with exact hex values
- Page dimensions and page names (≤ 6 words each)
- All table/column names verbatim

**Rule 2 — Use the standard formatting script**
Never re-derive formatting commands from scratch. Copy from
`C:\Users\adebo\Reports\STANDARD_FORMAT_PLAYBOOK.sh` (see below).
All confirmed-working pbir commands are stored there.

**Rule 3 — Use the CF recipe table above**
CF container/property names are now confirmed. Never run `schema describe` for:
- `dataPoint.fill` on bar charts
- `background.color` on cardVisual
- `label.fontColor` on cardVisual

**Rule 4 — Batch visual creation with a Python script**
Always write a `build_visuals_XXX.py` that creates all visual.json files
in one pass. Never create visuals one at a time via the pbir CLI.
Use 16-char hex IDs from the start (`secrets.token_hex(8)`).

**Rule 5 — Bind with a Python script too**
Write `bind_visuals_XXX.py` that maps hex IDs to queryState dicts.
Never use `pbir visuals bind` iteratively for mass binding — too slow.

**Rule 6 — Validate once at the end, not after every change**
The only validation that matters:
- After all visuals are created and bound (check for structural errors)
- After all CF and formatting is applied (final check)
`RENDER_REQUIRED_ROLE_MISSING` warnings are always expected with stub models.

**Rule 7 — Reuse known page IDs**
Generate 16-char hex page IDs upfront and record them in the spec.
Avoid `pbir pages rename` mid-build — it causes sync issues between
the page folder name and page.json display name.

**Rule 8 — The go-live guide is always the same**
The `GO_LIVE_GUIDE.md` template covers 95% of all future dashboards.
Copy it from the market-share-dashboard folder, swap project-specific names.

### Estimated token savings per rule
| Rule | Est. tokens saved per build |
|---|---|
| Pre-filled spec with exact measure names | 2,000–5,000 |
| Standard formatting script (no re-discovery) | 1,500–3,000 |
| CF recipes pre-known (no schema describe) | 1,000–2,000 |
| Python bulk build scripts (no iterative CLI) | 3,000–6,000 |
| Validate once not iteratively | 500–1,000 |
| **Total estimated savings** | **8,000–17,000 tokens/build** |

---

## pbir CLI v0.9.7 — Confirmed command changes (April 2026)

### `pbir add visual` — correct flags
```bash
# CORRECT: --width and --height (not --w/--h); --name for explicit ID
pbir -q add visual VTYPE "Report.Report/Page.Page" \
  --title "Title" --name "my-short-id" \
  --x 16 --y 120 --width 408 --height 40

# Explicit --name avoids schema validation failures from long auto-generated slugs
# Non-hex names generate a UserWarning but are functional
```

### `pbir visuals bind` — replaces `pbir dax bind`
```bash
# CORRECT command name is: pbir visuals bind (NOT pbir dax bind)
pbir -q visuals bind "Report.Report/Page.Page/visual-id.Visual" \
  --add "Role:Table.FieldOrMeasure" --type Column --no-validate
# --type: Column | Measure
# Use --clear Role before --add to overwrite single-field roles (Category, X, Y, Size)
```

### Confirmed role names per visual type

| Visual type     | Role       | Type   | Notes |
|---|---|---|---|
| slicer          | Values     | Column | NOT "Field" |
| cardVisual      | Data       | Measure | NOT "Values" |
| clusteredBarChart | Category | Column | max 1; clear before re-add |
| clusteredBarChart | Y        | Measure | multiple allowed |
| treemap         | Category   | Column | NOT "Group" |
| treemap         | Values     | Measure | |
| scatterChart    | X          | Measure | max 1 |
| scatterChart    | Y          | Measure | max 1 |
| scatterChart    | Size       | Measure | max 1 |
| scatterChart    | Category   | Column | label (replaces "Details") |
| scatterChart    | Legend     | Column | ONLY columns; measures not allowed |
| tableEx         | Values     | Column or Measure | multiple allowed |
| stackedBarChart | Category   | Column | max 1; clear before re-add |
| stackedBarChart | Y          | Measure | multiple allowed |

### subprocess calls to pbir.exe from Python
Strip PYTHON* env vars to avoid Python version conflicts with frozen .exe:
```python
_ENV = {k: v for k, v in os.environ.items() if not k.startswith("PYTHON")}
r = subprocess.run(cmd, capture_output=True, cwd=CWD, env=_ENV)
out = (r.stdout or b"").decode("utf-8", errors="replace")
```

### Textbox schema fix
Textboxes copied via `pbir cp` retain schema `2.2.0`. Upgrade to `2.7.0`:
```python
d["$schema"] = "https://developer.microsoft.com/.../visualContainer/2.7.0/schema.json"
```

---

## Standard Formatting Playbook Reference

See: `C:\Users\adebo\Reports\STANDARD_FORMAT_PLAYBOOK.sh`

This script applies all standard formatting to any new report in one pass:
- Page wallpaper (#F7F7F5)
- Hidden visual headers
- No borders
- White visual backgrounds
- Title: Segoe UI Semibold, 11pt, #475569
- Hide textbox titles

Run as:
```bash
REPORT="MyReport.Report" bash STANDARD_FORMAT_PLAYBOOK.sh
```
