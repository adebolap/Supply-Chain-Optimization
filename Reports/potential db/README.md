
# Potential Market Dashboard Local Project

This folder now contains a Power BI Project scaffold for the 5-page TIS Market Potential dashboard.

## Generated assets

- `PotentialMarket.pbip`: Power BI Project entry file
- `PotentialMarket.SemanticModel/`: local semantic model with v2 measure updates applied directly to the `.bim`
- `PotentialMarket.Report/`: 5-page report scaffold with themed, bound visual containers
- `specs/DASHBOARD_SPEC.md`: source functional spec
- `BUILD_CLARIFICATIONS.md`: sign-off criteria and testing script

## Open and validate

1. Open `PotentialMarket.pbip` in Power BI Desktop.
2. Refresh the model and confirm the report loads against the local CSVs.
3. Run the 7-step validation flow from `BUILD_CLARIFICATIONS.md`.

## Desktop finish-up checklist

Verify and complete in Desktop:

- synced slicers across pages
- drillthrough targets and back-button actions
- RI reference lines and custom tooltip pages
- conditional formatting backgrounds for RI, action badges, and target status
- single-select enforcement for page 4 category and page 5 customer slicers
- navigation actions from Executive overview

## Rebuild

```powershell
python "C:\Users\adebo\reports\potential db\scripts\build_potential_dashboard_project.py"
```
