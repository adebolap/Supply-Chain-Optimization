from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "PotentialMarket.SemanticModel" / "model.bim"
PAGES_ROOT = ROOT / "PotentialMarket.Report" / "definition" / "pages"


def load_model() -> dict:
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))


def build_index(model: dict) -> dict[str, dict[str, set[str]]]:
    index: dict[str, dict[str, set[str]]] = {}
    for table in model["model"]["tables"]:
        entities = index.setdefault(table["name"], {"columns": set(), "measures": set()})
        for column in table.get("columns", []):
            entities["columns"].add(column["name"])
        for measure in table.get("measures", []):
            entities["measures"].add(measure["name"])
    return index


def inspect_visuals(index: dict[str, dict[str, set[str]]]) -> list[str]:
    issues: list[str] = []
    for vfile in sorted(PAGES_ROOT.rglob("visual.json")):
        obj = json.loads(vfile.read_text(encoding="utf-8"))
        visual = obj.get("visual", {})
        vtype = visual.get("visualType")
        query_state = visual.get("query", {}).get("queryState", {})

        if vtype == "slicer" and "Values" not in query_state:
            issues.append(f"{vfile}: slicer should use queryState.Values")

        for bucket, payload in query_state.items():
            projections = payload.get("projections", [])
            for projection in projections:
                field = projection.get("field", {})
                if "Column" in field:
                    entity = field["Column"]["Expression"]["SourceRef"]["Entity"]
                    prop = field["Column"]["Property"]
                    if entity not in index:
                        issues.append(f"{vfile}: missing entity {entity}")
                    elif prop not in index[entity]["columns"]:
                        issues.append(f"{vfile}: missing column {entity}[{prop}]")
                elif "Measure" in field:
                    entity = field["Measure"]["Expression"]["SourceRef"]["Entity"]
                    prop = field["Measure"]["Property"]
                    if entity not in index:
                        issues.append(f"{vfile}: missing entity {entity}")
                    elif prop not in index[entity]["measures"]:
                        issues.append(f"{vfile}: missing measure {entity}[{prop}]")

                if vtype == "scatterChart" and bucket == "Legend" and "Measure" in field:
                    issues.append(f"{vfile}: scatter legend uses a measure; verify Desktop accepts this field")

    return issues


def main() -> None:
    model = load_model()
    index = build_index(model)
    issues = inspect_visuals(index)
    if not issues:
        print("Validation passed: all referenced fields/measures exist.")
        return
    print("Validation issues:")
    for issue in issues:
        print(f"- {issue}")


if __name__ == "__main__":
    main()
