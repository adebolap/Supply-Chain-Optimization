# Market Share Dashboard

This folder contains a transfer-safe Power BI `PBIP` build for the Market Share dashboard.

## Open the dashboard
- Open [MarketShare.pbip](C:\Users\adebo\reports\market-share-dashboard\MarketShare.pbip) in Power BI Desktop.
- The report is bound locally to [MarketShare.SemanticModel](C:\Users\adebo\reports\market-share-dashboard\MarketShare.SemanticModel), so it can open without the production model.

## Regenerate the dummy semantic model

Run:

```powershell
& 'C:\Users\adebo\reports\market-share-dashboard\scripts\Create-DummySemanticModel.ps1'
```

By default, the generator now creates:
- the required semantic-model files
- valid empty-or-sample import partitions for every table
- small linked sample rows so visuals and slicers have something to show
- `.platform` metadata in the format current Power BI Desktop expects

If you want a schema-only model with no sample rows:

```powershell
& 'C:\Users\adebo\reports\market-share-dashboard\scripts\Create-DummySemanticModel.ps1' -NoSampleData
```

## Key files
- Report binding: [definition.pbir](C:\Users\adebo\reports\market-share-dashboard\MarketShare.Report\definition.pbir)
- Dummy model: [model.bim](C:\Users\adebo\reports\market-share-dashboard\MarketShare.SemanticModel\model.bim)
- Generator: [Create-DummySemanticModel.ps1](C:\Users\adebo\reports\market-share-dashboard\scripts\Create-DummySemanticModel.ps1)
- Project notes: [DUMMY_TRANSFER_NOTES.md](C:\Users\adebo\reports\market-share-dashboard\DUMMY_TRANSFER_NOTES.md)
- Shared knowledge base: [DUMMY_SEMANTIC_MODEL_SCAFFOLD.md](C:\Users\adebo\reports\DUMMY_SEMANTIC_MODEL_SCAFFOLD.md)

## Transfer to another machine
- Copy the whole `market-share-dashboard` folder.
- Keep the relative folder structure intact.
- Open `MarketShare.pbip`.
- If Desktop raises a stricter schema error on a newer release, fix the local project files and then update the shared knowledge base.

## Later production cutover
- Replace the dummy semantic model with the real model, or rebind the report.
- Keep table, column, and measure names stable to make rebinding easier.
