# Market Share Dummy Build Notes

This dashboard now opens successfully in Power BI Desktop with a local dummy
semantic model.

## What is in place
- `MarketShare.pbip` is kept as a report-only PBIP entry file
- `MarketShare.Report/definition.pbir` binds the report to `../MarketShare.SemanticModel`
- `MarketShare.SemanticModel` contains a valid TMSL-only dummy model
- all dummy tables include empty typed import partitions so Desktop accepts Full DataView
- page metadata was cleaned to match the current report schema

## Files that matter
- PBIP entry: [MarketShare.pbip](C:\Users\adebo\reports\market-share-dashboard\MarketShare.pbip)
- Report binding: [definition.pbir](C:\Users\adebo\reports\market-share-dashboard\MarketShare.Report\definition.pbir)
- Working semantic model: [model.bim](C:\Users\adebo\reports\market-share-dashboard\MarketShare.SemanticModel\model.bim)
- Generator: [Create-DummySemanticModel.ps1](C:\Users\adebo\reports\market-share-dashboard\scripts\Create-DummySemanticModel.ps1)
- Shared KB: [DUMMY_SEMANTIC_MODEL_SCAFFOLD.md](C:\Users\adebo\reports\DUMMY_SEMANTIC_MODEL_SCAFFOLD.md)

## What we learned while making it open

### PBIP structure
- Do not add a `semanticModel` artifact entry to `MarketShare.pbip` for this setup.
- A report-only `.pbip` plus a path-bound local semantic model works.

### Semantic model format
- Do not mix `model.bim` with `definition/database.tmdl`.
- This project must stay TMSL-only.
- Do not mix legacy `item.metadata.json` with the newer `.platform` metadata file.
- This project should use `.platform` only.

### Dummy partitions
- Every table needs at least one import partition using Full DataView.
- The safest dummy partition is an empty typed M table built from `#table(...)`.
- The generator now supports lightweight sample rows so visuals can render demo content.

### Relationships
- The dummy model should be minimal, not exhaustive.
- Extra joins caused ambiguity between `Final Destination` and `Dim_Cust`.
- The fix was to remove unnecessary bridge relationships instead of trying to model every production path.

### Page schema
- `page.json` cannot include unsupported properties like `ordinal`.

## Current generator usage

Regenerate the dummy semantic model with:

```powershell
& 'C:\Users\adebo\reports\market-share-dashboard\scripts\Create-DummySemanticModel.ps1'
```

The script currently:
- writes `model.bim`
- writes `definition.bim`
- writes both `definition.pbism` files
- preserves or creates `.platform`
- removes legacy `item.metadata.json` if present
- creates empty typed partitions for every dummy table
- injects linked sample data by default
- avoids recreating mixed TMDL/TMSL artifacts

To generate a schema-only model without sample rows:

```powershell
& 'C:\Users\adebo\reports\market-share-dashboard\scripts\Create-DummySemanticModel.ps1' -NoSampleData
```

## If this project is moved to another machine
- copy the whole `market-share-dashboard` folder
- keep the relative folder structure unchanged
- open `MarketShare.pbip`
- if Desktop raises a new schema/model error on a newer release, fix the project-local files and then update the shared KB

## What still happens later
- replace the dummy semantic model with the real one, or rebind the report
- validate all measures against live data
- finish remaining visual build-out and formatting
- test interactions, drill behavior, and any AI narrative visuals with live data

## Transfer rule
Keep table names, column names, and measure names stable. That naming contract is
what makes later rebinding or model replacement much easier.
