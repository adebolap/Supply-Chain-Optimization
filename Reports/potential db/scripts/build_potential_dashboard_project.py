from __future__ import annotations

import json
import shutil
import textwrap
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_NAME = "PotentialMarket"
PBIP_NAME = f"{PROJECT_NAME}.pbip"
REPORT_DIR = ROOT / f"{PROJECT_NAME}.Report"
MODEL_DIR = ROOT / f"{PROJECT_NAME}.SemanticModel"
MODEL_SOURCE = ROOT / "potential.bim"

PAGE_WIDTH = 1280
PAGE_HEIGHT = 720
MARGIN = 16
GAP = 12


def write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def literal_expr(value: str) -> dict:
    return {"expr": {"Literal": {"Value": f"'{value}'"}}}


def new_guid() -> str:
    return str(uuid.uuid4())


def expr_lines(dax: str) -> list[str]:
    return textwrap.dedent(dax).strip("\n").splitlines()


def build_pbip_root() -> None:
    payload = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
        "version": "1.0",
        "artifacts": [{"report": {"path": REPORT_DIR.name}}],
        "settings": {"enableAutoRecovery": True},
    }
    write_json(ROOT / PBIP_NAME, payload)


def table_lookup(model: dict) -> dict[str, dict]:
    return {table["name"]: table for table in model["model"]["tables"]}


def measure_lookup(table: dict) -> dict[str, dict]:
    return {measure["name"]: measure for measure in table.get("measures", [])}


def ensure_measure(table: dict, name: str, dax: str, folder: str, fmt: str = "", hidden: bool = False) -> None:
    measures = table.setdefault("measures", [])
    existing = measure_lookup(table).get(name)
    if existing is None:
        existing = {
            "name": name,
            "expression": expr_lines(dax),
            "lineageTag": new_guid(),
        }
        measures.append(existing)
    else:
        existing["expression"] = expr_lines(dax)

    existing["displayFolder"] = folder
    if fmt:
        existing["formatString"] = fmt
    if hidden:
        existing["isHidden"] = True
    elif "isHidden" in existing and not hidden:
        existing.pop("isHidden", None)


def move_measure(table: dict, name: str, folder: str) -> None:
    existing = measure_lookup(table).get(name)
    if existing is not None:
        existing["displayFolder"] = folder


def apply_measure_updates(model: dict) -> None:
    fact_table = table_lookup(model)["fact_market_potential"]
    folder_root = "MS v2"

    ensure_measure(
        fact_table,
        "_Current Sales Year",
        """
        MAX ( Sales_Category[Year] )
        """,
        f"{folder_root}\\00 Helpers",
        "0",
        hidden=True,
    )

    ensure_measure(
        fact_table,
        "_Current Potential Year",
        """
        VAR MaxYearInt =
            MAXX ( ALL ( fact_market_potential[year] ), VALUE ( fact_market_potential[year] ) )
        RETURN
            FORMAT ( MaxYearInt, "0" )
        """,
        f"{folder_root}\\00 Helpers",
        hidden=True,
    )

    ensure_measure(
        fact_table,
        "Pot Realized Qty",
        """
        VAR CurrentYear = [_Current Sales Year]
        RETURN
            CALCULATE (
                SUM ( Sales_Category[Qty Sold] ),
                KEEPFILTERS ( Sales_Category[Year] = CurrentYear )
            )
        """,
        f"{folder_root}\\01 Core",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "Pot Realized Sales EUR",
        """
        VAR CurrentYear = [_Current Sales Year]
        RETURN
            CALCULATE (
                SUM ( Sales_Category[Sales EUR] ),
                KEEPFILTERS ( Sales_Category[Year] = CurrentYear )
            )
        """,
        f"{folder_root}\\01 Core",
        "€#,##0",
    )

    ensure_measure(
        fact_table,
        "Pot Total Potential Units (Latest)",
        """
        VAR LatestYear = [_Current Potential Year]
        RETURN
            CALCULATE (
                [Pot Total Potential Units],
                KEEPFILTERS ( fact_market_potential[year] = LatestYear )
            )
        """,
        f"{folder_root}\\01 Core",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Estimated Share %",
        """
        DIVIDE ( [Pot Realized Qty], [Pot Total Potential Units (Latest)] )
        """,
        f"{folder_root}\\01 Core",
        "0.0%",
    )

    ensure_measure(
        fact_table,
        "MS Targetable Units",
        """
        [Pot Total Potential Units (Latest)] * [MS Benchmark Share %]
        """,
        f"{folder_root}\\04 Opportunity",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Units to Target",
        """
        VAR TargetRI =
            DIVIDE ( [MS Target RI Value], 100, 1 )
        VAR TargetRate =
            [MS Benchmark Share %] * TargetRI
        VAR RequiredUnits =
            [Pot Total Potential Units (Latest)] * TargetRate
        RETURN
            MAX ( 0, ROUND ( RequiredUnits - [Pot Realized Qty], 0 ) )
        """,
        f"{folder_root}\\05 Target",
        "#,##0",
    )

    milestone_levels = {
        "50": 0.50,
        "75": 0.75,
        "100": 1.00,
        "150": 1.50,
    }
    for label, factor in milestone_levels.items():
        ensure_measure(
            fact_table,
            f"MS Units to Reach RI {label}",
            f"""
            VAR TargetRate =
                [MS Benchmark Share %] * {factor:.2f}
            VAR RequiredUnits =
                [Pot Total Potential Units (Latest)] * TargetRate
            RETURN
                MAX ( 0, ROUND ( RequiredUnits - [Pot Realized Qty], 0 ) )
            """,
            f"{folder_root}\\05 Target",
            "#,##0",
        )

    ensure_measure(
        fact_table,
        "MS Revenue-Weighted Category Priority",
        """
        VAR GapEUR = [Pot Gap EUR]
        VAR Share = [MS Estimated Share %]
        RETURN
            IF (
                ISBLANK ( GapEUR ),
                BLANK (),
                ROUND ( GapEUR * ( 1 - COALESCE ( Share, 0 ) ), 0 )
            )
        """,
        f"{folder_root}\\04 Opportunity",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Category Revenue Rank",
        """
        IF (
            ISBLANK ( [Pot Realized Sales EUR] ),
            BLANK (),
            RANKX (
                ALL ( dim_terumo_category[terumo_category] ),
                [Pot Realized Sales EUR],
                , DESC, DENSE
            )
        )
        """,
        f"{folder_root}\\02 Revenue",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Customer Revenue Rank",
        """
        IF (
            ISBLANK ( [Pot Realized Sales EUR] ),
            BLANK (),
            RANKX (
                ALL ( Dim_Cust[Customer] ),
                [Pot Realized Sales EUR],
                , DESC, DENSE
            )
        )
        """,
        f"{folder_root}\\02 Revenue",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Revenue Concentration Top20",
        """
        VAR TotalCustomers =
            CALCULATE (
                DISTINCTCOUNT ( Sales_Category[Customer Id] ),
                REMOVEFILTERS ( Dim_Cust ),
                Sales_Category[Qty Sold] > 0
            )
        VAR Top20Threshold = ROUNDUP ( TotalCustomers * 0.2, 0 )
        VAR Top20Revenue =
            SUMX (
                TOPN (
                    Top20Threshold,
                    ADDCOLUMNS (
                        VALUES ( Dim_Cust[Customer] ),
                        "@rev", [Pot Realized Sales EUR]
                    ),
                    [@rev], DESC
                ),
                [@rev]
            )
        VAR TotalRevenue =
            CALCULATE ( [Pot Realized Sales EUR], REMOVEFILTERS ( Dim_Cust ) )
        RETURN
            DIVIDE ( Top20Revenue, TotalRevenue )
        """,
        f"{folder_root}\\02 Revenue",
        "0.0%",
    )

    ensure_measure(
        fact_table,
        "MS Customer Potential Value EUR",
        """
        SUMX (
            VALUES ( dim_terumo_category[terumo_category] ),
            [MS Targetable Units] * [Pot Avg Price EUR]
        )
        """,
        f"{folder_root}\\04 Opportunity",
        "€#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Gap as Pct of Potential",
        """
        VAR PotVal =
            SUMX (
                VALUES ( dim_terumo_category[terumo_category] ),
                [MS Targetable Units] * [Pot Avg Price EUR]
            )
        RETURN
            DIVIDE ( [Pot Gap EUR], PotVal )
        """,
        f"{folder_root}\\04 Opportunity",
        "0.0%",
    )

    ensure_measure(
        fact_table,
        "MS Customer Priority in Category",
        """
        VAR GapUnits = [Pot Gap Units]
        VAR RI = [MS Realization Index]
        VAR RevShare = [MS Customer Revenue Share]
        RETURN
            IF (
                ISBLANK ( GapUnits ) || GapUnits <= 0,
                0,
                ROUND (
                    GapUnits
                    * COALESCE ( RevShare, 0.01 )
                    * DIVIDE ( MAX ( 0, 150 - COALESCE ( RI, 0 ) ), 100, 0 ),
                    0
                )
            )
        """,
        f"{folder_root}\\06 Category View",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Customer Action in Category",
        """
        VAR RI = [MS Realization Index]
        VAR GapUnits = [Pot Gap Units]
        RETURN
            SWITCH (
                TRUE (),
                ISBLANK ( GapUnits ), BLANK (),
                GapUnits <= 0, "Fully Penetrated",
                RI < 50, "Priority Target",
                RI < 80, "Growth Opportunity",
                RI < 100, "Capture Remaining",
                "Protect Position"
            )
        """,
        f"{folder_root}\\06 Category View",
    )

    ensure_measure(
        fact_table,
        "MS Category Customer Count",
        """
        CALCULATE (
            DISTINCTCOUNT ( Sales_Category[Customer Id] ),
            Sales_Category[Qty Sold] > 0
        )
        """,
        f"{folder_root}\\06 Category View",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Category Whitespace Customers",
        """
        VAR TotalCustomersInScope =
            CALCULATE (
                DISTINCTCOUNT ( fact_market_potential[customer_id] ),
                REMOVEFILTERS ( dim_terumo_category )
            )
        VAR BuyingCustomers = [MS Category Customer Count]
        RETURN
            TotalCustomersInScope - BuyingCustomers
        """,
        f"{folder_root}\\06 Category View",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Total Addressable Market EUR",
        """
        SUMX (
            CROSSJOIN (
                VALUES ( Dim_Cust[Customer] ),
                VALUES ( dim_terumo_category[terumo_category] )
            ),
            [MS Targetable Units] * [Pot Avg Price EUR]
        )
        """,
        f"{folder_root}\\07 Executive",
        "€#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Portfolio Realization Pct",
        """
        DIVIDE (
            [Pot Realized Sales EUR],
            CALCULATE (
                [MS Total Addressable Market EUR],
                REMOVEFILTERS ( Dim_Cust ),
                REMOVEFILTERS ( dim_terumo_category )
            )
        )
        """,
        f"{folder_root}\\07 Executive",
        "0.0%",
    )

    ensure_measure(
        fact_table,
        "MS Growth Target Account Count",
        """
        COUNTROWS (
            FILTER (
                VALUES ( Dim_Cust[Customer] ),
                [MS Realization Index] < 50
                    && NOT ISBLANK ( [MS Realization Index] )
            )
        )
        """,
        f"{folder_root}\\07 Executive",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Champion Account Count",
        """
        COUNTROWS (
            FILTER (
                VALUES ( Dim_Cust[Customer] ),
                [MS Realization Index] >= 150
            )
        )
        """,
        f"{folder_root}\\07 Executive",
        "#,##0",
    )

    ensure_measure(
        fact_table,
        "MS Total Gap EUR",
        """
        SUMX (
            CROSSJOIN (
                VALUES ( Dim_Cust[Customer] ),
                VALUES ( dim_terumo_category[terumo_category] )
            ),
            [Pot Gap EUR]
        )
        """,
        f"{folder_root}\\07 Executive",
        "€#,##0",
    )

    ensure_measure(
        fact_table,
        "_CF RI Visual Color",
        """
        SWITCH (
            TRUE (),
            [MS Realization Index] < 50, "#A32D2D",
            [MS Realization Index] < 80, "#BA7517",
            [MS Realization Index] < 100, "#D4A35A",
            [MS Realization Index] < 150, "#639922",
            "#1D9E75"
        )
        """,
        f"{folder_root}\\00 Helpers",
        hidden=True,
    )

    ensure_measure(
        fact_table,
        "_CF Action Visual Color",
        """
        SWITCH (
            TRUE (),
            [MS Action Flag] = "Focus as Priority", "#A32D2D",
            [MS Action Flag] = "Capture Potential", "#BA7517",
            [MS Action Flag] = "Optimise Contact", "#185FA5",
            [MS Action Flag] = "Keep Protecting", "#639922",
            "#185FA5"
        )
        """,
        f"{folder_root}\\00 Helpers",
        hidden=True,
    )

    ensure_measure(
        fact_table,
        "_CF Customer Action Visual Color",
        """
        SWITCH (
            TRUE (),
            [MS Customer Action Badge] = "Grow", "#A32D2D",
            [MS Customer Action Badge] = "Monitor", "#BA7517",
            [MS Customer Action Badge] = "Maintain", "#185FA5",
            [MS Customer Action Badge] = "Protect", "#639922",
            "#185FA5"
        )
        """,
        f"{folder_root}\\00 Helpers",
        hidden=True,
    )

    ensure_measure(
        fact_table,
        "_CF Target Status Visual Color",
        """
        SWITCH (
            TRUE (),
            [MS Current vs Target Status] = "Below target", "#A32D2D",
            [MS Current vs Target Status] = "Halfway", "#BA7517",
            [MS Current vs Target Status] = "Near target", "#D4A35A",
            [MS Current vs Target Status] = "Achieved", "#639922",
            "#185FA5"
        )
        """,
        f"{folder_root}\\00 Helpers",
        hidden=True,
    )

    ensure_measure(
        fact_table,
        "_CF Gap Visual Color",
        """
        SWITCH (
            TRUE (),
            [Pot Gap EUR] <= 0, "#639922",
            [Pot Gap EUR] < 50000, "#D4A35A",
            [Pot Gap EUR] < 250000, "#BA7517",
            "#A32D2D"
        )
        """,
        f"{folder_root}\\00 Helpers",
        hidden=True,
    )

    folder_moves = {
        "Pot Total Potential Units": f"{folder_root}\\01 Core",
        "Pot Total Procedures (dedup)": f"{folder_root}\\01 Core",
        "Pot Realization %": f"{folder_root}\\01 Core",
        "Pot Avg Price EUR": f"{folder_root}\\03 Value",
        "Pot Potential Value EUR": f"{folder_root}\\04 Opportunity",
        "Pot Gap Units": f"{folder_root}\\04 Opportunity",
        "Pot Gap EUR": f"{folder_root}\\04 Opportunity",
        "Pot Realized Sales EUR (DNA total)": f"{folder_root}\\01 Core",
        "MS National Realization Pct": f"{folder_root}\\02 Benchmark",
        "MS Realization Index": f"{folder_root}\\02 Benchmark",
        "MS Benchmark Share %": f"{folder_root}\\02 Benchmark",
        "MS Benchmark Level": f"{folder_root}\\02 Benchmark",
        "MS Avg Price by Category": f"{folder_root}\\03 Value",
        "MS Category Revenue Share": f"{folder_root}\\02 Revenue",
        "MS Customer Revenue Share": f"{folder_root}\\02 Revenue",
        "MS Revenue Opportunity": f"{folder_root}\\04 Opportunity",
        "MS Customer Category Mix": f"{folder_root}\\03 Customer Strength",
        "MS National Category Mix": f"{folder_root}\\03 Customer Strength",
        "MS Mix Index": f"{folder_root}\\03 Customer Strength",
        "MS Category Coverage": f"{folder_root}\\03 Customer Strength",
        "MS Whitespace Count": f"{folder_root}\\03 Customer Strength",
        "MS Customer Strength Badge": f"{folder_root}\\04 Account Priority",
        "MS Customer Action Badge": f"{folder_root}\\04 Account Priority",
        "MS Account Priority Score": f"{folder_root}\\04 Account Priority",
        "MS Weighted Opportunity Score": f"{folder_root}\\04 Opportunity",
        "MS Category Priority Score": f"{folder_root}\\04 Opportunity",
        "MS Target RI Value": f"{folder_root}\\05 Target",
        "MS Target RI Label": f"{folder_root}\\05 Target",
        "MS Current vs Target Status": f"{folder_root}\\05 Target",
        "MS Action Flag": f"{folder_root}\\05 Target",
    }
    for measure_name, folder in folder_moves.items():
        move_measure(fact_table, measure_name, folder)


def csv_type(data_type: str) -> str:
    mapping = {
        "string": "type text",
        "double": "type number",
        "decimal": "type number",
        "int64": "Int64.Type",
        "int32": "Int64.Type",
        "boolean": "type logical",
        "dateTime": "type datetime",
        "date": "type date",
    }
    return mapping.get(data_type, "type text")


def build_csv_expression(table: dict, csv_path: Path) -> list[str]:
    transforms = []
    for column in table.get("columns", []):
        if column.get("type") == "calculated":
            continue
        source_column = column.get("sourceColumn")
        if not source_column:
            continue
        transforms.append(f'{{"{source_column}", {csv_type(column.get("dataType", "string"))}}}')

    lines = [
        "let",
        f'    Source = Csv.Document(File.Contents("{csv_path.as_posix()}"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),',
        '    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),',
    ]
    if transforms:
        joined = ", ".join(transforms)
        lines.append(f'    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers", {{{joined}}})')
        lines.extend(["in", '    #"Changed Type"'])
    else:
        lines.extend(["in", '    #"Promoted Headers"'])
    return lines


def rebind_dummy_partitions(model: dict) -> None:
    csv_map = {
        "fact_market_potential": "fact_market_potential.csv",
        "Sales_Category": "sales_category.csv",
        "Dim_Cust": "dim_cust.csv",
        "dim_terumo_category": "dim_terumo_category.csv",
        "dim_procedure": "dim_procedure.csv",
        "dim_customer_market": "dim_customer_market.csv",
        "Shp_Dim_Country_Hierarchy": "shp_dim_country_hierarchy.csv",
        "bridge_procedure_to_terumo": "bridge_procedure_to_terumo.csv",
        "map_product_to_terumo_category": "map_product_to_terumo_category.csv",
        "mapping_estimates_detail": "mapping_estimates_detail.csv",
        "Segmentation Cardio": "segmentation_cardio.csv",
        "Segmentation PI": "segmentation_pi.csv",
        "Segmentation IO": "segmentation_io.csv",
    }
    tables = table_lookup(model)
    data_dir = ROOT / "data"
    for table_name, csv_name in csv_map.items():
        table = tables.get(table_name)
        if not table or not table.get("partitions"):
            continue
        csv_path = data_dir / csv_name
        table["partitions"][0]["source"] = {
            "type": "m",
            "expression": build_csv_expression(table, csv_path),
        }


def load_model() -> dict:
    return json.loads(MODEL_SOURCE.read_text(encoding="utf-8-sig"))


def write_semantic_model(model: dict) -> None:
    if MODEL_DIR.exists():
        shutil.rmtree(MODEL_DIR)

    write_json(
        MODEL_DIR / ".platform",
        {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
            "metadata": {
                "type": "SemanticModel",
                "displayName": PROJECT_NAME,
                "description": "Local semantic model for the TIS Market Potential dashboard using dummy CSV bindings.",
            },
            "config": {"version": "2.0", "logicalId": new_guid()},
        },
    )
    sem_payload = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
        "version": "4.2",
        "settings": {},
    }
    write_json(MODEL_DIR / "definition.pbism", sem_payload)
    write_json(MODEL_DIR / "definition" / "definition.pbism", sem_payload)
    model_text = json.dumps(model, indent=2, ensure_ascii=False)
    write_text(MODEL_DIR / "model.bim", model_text)
    write_text(MODEL_DIR / "definition.bim", model_text)


def theme_payload() -> dict:
    return {
        "$schema": "https://powerbi.com/product/schema#reportTheme",
        "name": "terumo_light",
        "dataColors": ["#185FA5", "#BA7517", "#1D9E75", "#639922", "#A32D2D", "#5B8FC0", "#D4A35A", "#8CB68E"],
        "good": "#639922",
        "neutral": "#BA7517",
        "bad": "#A32D2D",
        "background": "#FFFFFF",
        "foreground": "#27313B",
        "tableAccent": "#F8F7F5",
        "textClasses": {
            "title": {"fontFace": "Segoe UI Semibold", "fontSize": 12, "color": "#27313B"},
            "label": {"fontFace": "Segoe UI", "fontSize": 10, "color": "#27313B"},
            "callout": {"fontFace": "Segoe UI Semibold", "fontSize": 24, "color": "#27313B"},
            "header": {"fontFace": "Segoe UI Semibold", "fontSize": 11, "color": "#27313B"},
        },
        "visualStyles": {
            "*": {
                "*": {
                    "title": [{"show": True, "alignment": "left", "fontFamily": "Segoe UI Semibold", "fontSize": 11}],
                    "subTitle": [{"show": False}],
                    "background": [{"show": True, "color": {"solid": {"color": "#F8F7F5"}}, "transparency": 0}],
                    "border": [{"show": True, "color": {"solid": {"color": "#E5E1DC"}}, "radius": 8, "width": 1}],
                    "padding": [{"top": 8, "bottom": 8, "left": 8, "right": 8}],
                }
            },
            "page": {"*": {"background": [{"color": {"solid": {"color": "#FFFFFF"}}, "transparency": 0}]}},
            "cardVisual": {"*": {"labels": [{"show": True, "fontFamily": "Segoe UI Semibold", "fontSize": 22}], "categoryLabels": [{"show": True, "fontFamily": "Segoe UI", "fontSize": 10}]}},
            "tableEx": {"*": {"grid": [{"gridHorizontal": False, "gridVertical": False, "rowPadding": 4, "textSize": 10}], "columnHeaders": [{"fontFamily": "Segoe UI Semibold", "fontSize": 10.5}], "values": [{"fontFamily": "Segoe UI", "fontSize": 10}]}},
            "scatterChart": {"*": {"labels": [{"show": False}]}},
            "clusteredBarChart": {"*": {"labels": [{"show": True}]}},
            "stackedBarChart": {"*": {"labels": [{"show": True}]}},
            "slicer": {"*": {"general": [{"responsive": True}], "items": [{"padding": 4}]}}
        },
    }


def visual_base(name: str, visual_type: str, x: int, y: int, width: int, height: int, title: str | None = None) -> dict:
    visual = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.7.0/schema.json",
        "name": name,
        "position": {"x": x, "y": y, "z": 0, "height": height, "width": width, "tabOrder": 0},
        "visual": {"visualType": visual_type, "drillFilterOtherVisuals": True},
    }
    if visual_type != "textbox":
        visual["visual"]["query"] = {"queryState": {}}
        if title:
            visual["visual"]["visualContainerObjects"] = {
                "title": [{"properties": {"show": {"expr": {"Literal": {"Value": "true"}}}, "text": literal_expr(title)}}],
                "subTitle": [{"properties": {"show": {"expr": {"Literal": {"Value": "false"}}}}}],
            }
    return visual


def textbox_visual(name: str, x: int, y: int, width: int, height: int, text: str, font_size: int = 13, color: str = "#27313B") -> dict:
    visual = visual_base(name, "textbox", x, y, width, height)
    visual["visual"]["objects"] = {
        "general": [{"properties": {"paragraphs": [{"textRuns": [{"value": text, "textStyle": {"fontFace": "Segoe UI Semibold", "fontSize": f"{font_size}pt", "color": color}}]}]}}]
    }
    return visual


def col(entity: str, prop: str) -> dict:
    return {"Column": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}


def msr(entity: str, prop: str) -> dict:
    return {"Measure": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}


def cref(entity: str, prop: str) -> str:
    return f"{entity}.{prop}"


def mref(entity: str, prop: str) -> str:
    return f"Sum({entity}.{prop})"


def set_query(visual: dict, query_state: dict) -> dict:
    visual["visual"]["query"]["queryState"] = query_state
    return visual


def slicer_visual(name: str, x: int, y: int, width: int, height: int, title: str, entity: str, prop: str) -> dict:
    return set_query(visual_base(name, "slicer", x, y, width, height, title), {"Values": {"projections": [{"field": col(entity, prop), "queryRef": cref(entity, prop), "active": True}]}})


def card_visual(name: str, x: int, y: int, width: int, height: int, title: str, entity: str, measure: str) -> dict:
    return set_query(visual_base(name, "cardVisual", x, y, width, height, title), {"Values": {"projections": [{"field": msr(entity, measure), "queryRef": mref(entity, measure), "active": True}]}})


def chart_visual(name: str, visual_type: str, x: int, y: int, width: int, height: int, title: str, category: tuple[str, str], measures: list[tuple[str, str]]) -> dict:
    query = {
        "Category": {"projections": [{"field": col(*category), "queryRef": cref(*category), "active": True}]},
        "Y": {"projections": [{"field": msr(entity, measure), "queryRef": mref(entity, measure), "active": True} for entity, measure in measures]},
    }
    return set_query(visual_base(name, visual_type, x, y, width, height, title), query)


def treemap_visual(name: str, x: int, y: int, width: int, height: int, title: str) -> dict:
    return set_query(
        visual_base(name, "treemap", x, y, width, height, title),
        {
            "Category": {"projections": [{"field": col("dim_terumo_category", "terumo_category"), "queryRef": cref("dim_terumo_category", "terumo_category"), "active": True}]},
            "Values": {"projections": [{"field": msr("fact_market_potential", "Pot Gap EUR"), "queryRef": mref("fact_market_potential", "Pot Gap EUR"), "active": True}]},
            "ColorSaturation": {"projections": [{"field": msr("fact_market_potential", "MS Realization Index"), "queryRef": mref("fact_market_potential", "MS Realization Index"), "active": True}]},
        },
    )


def scatter_visual(name: str, x: int, y: int, width: int, height: int, title: str, x_measure: tuple[str, str], y_measure: tuple[str, str], size_measure: tuple[str, str], detail: tuple[str, str], legend: tuple[str, str] | None = None) -> dict:
    query = {
        "X": {"projections": [{"field": msr(*x_measure), "queryRef": mref(*x_measure), "active": True}]},
        "Y": {"projections": [{"field": msr(*y_measure), "queryRef": mref(*y_measure), "active": True}]},
        "Size": {"projections": [{"field": msr(*size_measure), "queryRef": mref(*size_measure), "active": True}]},
        "Details": {"projections": [{"field": col(*detail), "queryRef": cref(*detail), "active": True}]},
    }
    if legend:
        query["Legend"] = {"projections": [{"field": msr(*legend), "queryRef": mref(*legend), "active": True}]}
    return set_query(visual_base(name, "scatterChart", x, y, width, height, title), query)


def table_visual(name: str, x: int, y: int, width: int, height: int, title: str, fields: list[tuple[str, str, bool]]) -> dict:
    projections = []
    for entity, field_name, is_measure in fields:
        field = msr(entity, field_name) if is_measure else col(entity, field_name)
        query_ref = mref(entity, field_name) if is_measure else cref(entity, field_name)
        projections.append({"field": field, "queryRef": query_ref, "active": True})
    return set_query(visual_base(name, "tableEx", x, y, width, height, title), {"Values": {"projections": projections}})


def page_json(page_name: str, display_name: str) -> dict:
    return {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
        "name": page_name,
        "displayName": display_name,
        "width": PAGE_WIDTH,
        "height": PAGE_HEIGHT,
        "displayOption": "FitToPage",
        "objects": {"outspace": [{"properties": {"color": {"solid": {"color": {"expr": {"Literal": {"Value": "'#FFFFFF'"}}}}}}}]},
    }


def page_definitions() -> list[dict]:
    six_card_width = (PAGE_WIDTH - 2 * MARGIN - 5 * GAP) // 6
    three_slicer_width = (PAGE_WIDTH - 2 * MARGIN - 2 * GAP) // 3
    four_card_width = (PAGE_WIDTH - 2 * MARGIN - 3 * GAP) // 4
    five_card_width = (PAGE_WIDTH - 2 * MARGIN - 4 * GAP) // 5
    chart_w = (PAGE_WIDTH - 2 * MARGIN - GAP) // 2

    pages = []

    p = {
        "name": "ExecutiveOverview",
        "displayName": "Executive overview",
        "visuals": [
            textbox_visual("title", MARGIN, 12, 420, 28, "Executive overview", 15),
            textbox_visual("nav_products", PAGE_WIDTH - 280, 12, 120, 24, "Go to Products", 10, "#185FA5"),
            textbox_visual("nav_customers", PAGE_WIDTH - 150, 12, 120, 24, "Go to Customers", 10, "#185FA5"),
            slicer_visual("country_slicer", MARGIN, 48, three_slicer_width, 40, "Country", "Dim_Cust", "Country Text"),
            slicer_visual("segment_slicer", MARGIN + three_slicer_width + GAP, 48, three_slicer_width, 40, "Customer segment", "fact_market_potential", "customer_segment"),
            slicer_visual("category_slicer", MARGIN + 2 * (three_slicer_width + GAP), 48, three_slicer_width, 40, "Product category", "dim_terumo_category", "terumo_category"),
        ],
    }
    for idx, (name, title, measure) in enumerate([
        ("tam_card", "Total addressable market EUR", "MS Total Addressable Market EUR"),
        ("realized_card", "Realized sales EUR", "Pot Realized Sales EUR"),
        ("gap_card", "Total gap EUR", "MS Total Gap EUR"),
        ("portfolio_card", "Portfolio realization %", "MS Portfolio Realization Pct"),
        ("champion_card", "Champion accounts", "MS Champion Account Count"),
        ("growth_card", "Growth target accounts", "MS Growth Target Account Count"),
    ]):
        p["visuals"].append(card_visual(name, MARGIN + idx * (six_card_width + GAP), 98, six_card_width, 72, title, "fact_market_potential", measure))
    p["visuals"].extend([
        chart_visual("category_stack", "stackedBarChart", MARGIN, 182, chart_w, 210, "Revenue opportunity by category", ("dim_terumo_category", "terumo_category"), [("fact_market_potential", "Pot Realized Sales EUR"), ("fact_market_potential", "Pot Gap EUR")]),
        treemap_visual("gap_treemap", MARGIN + chart_w + GAP, 182, chart_w, 210, "Gap concentration"),
        scatter_visual("country_scatter", MARGIN, 404, chart_w, 260, "Country comparison", ("fact_market_potential", "Pot Realized Sales EUR"), ("fact_market_potential", "MS Realization Index"), ("fact_market_potential", "Pot Gap EUR"), ("Dim_Cust", "Country Text")),
        table_visual("country_table", MARGIN + chart_w + GAP, 404, chart_w, 260, "Country detail", [("Dim_Cust", "Country Text", False), ("fact_market_potential", "Pot Realized Sales EUR", True), ("fact_market_potential", "MS Realization Index", True), ("fact_market_potential", "Pot Gap EUR", True), ("fact_market_potential", "MS Growth Target Account Count", True), ("fact_market_potential", "MS Champion Account Count", True)]),
    ])
    pages.append(p)

    p = {"name": "WhereToGoProducts", "displayName": "Where to go — Products", "visuals": [textbox_visual("title", MARGIN, 12, 420, 28, "Where to go — Products", 15)]}
    for idx, meta in enumerate([("country_slicer", "Country", "Dim_Cust", "Country Text"), ("procedure_slicer", "Procedure group", "dim_procedure", "procedure_group"), ("category_slicer", "Product category", "dim_terumo_category", "terumo_category")]):
        name, title, entity, field = meta
        p["visuals"].append(slicer_visual(name, MARGIN + idx * (three_slicer_width + GAP), 48, three_slicer_width, 40, title, entity, field))
    for idx, (name, title, measure) in enumerate([
        ("real_sales", "Pot realized sales EUR", "Pot Realized Sales EUR"),
        ("real_qty", "Pot realized qty", "Pot Realized Qty"),
        ("total_potential", "Pot total potential units", "Pot Total Potential Units"),
        ("gap_units", "Pot gap units", "Pot Gap Units"),
        ("gap_eur", "Pot gap EUR", "Pot Gap EUR"),
        ("potential_value", "Potential value EUR", "Pot Potential Value EUR"),
    ]):
        p["visuals"].append(card_visual(name, MARGIN + idx * (six_card_width + GAP), 98, six_card_width, 72, title, "fact_market_potential", measure))
    p["visuals"].extend([
        chart_visual("revenue_opportunity_bar", "clusteredBarChart", MARGIN, 182, PAGE_WIDTH - 2 * MARGIN, 180, "Revenue opportunity matrix", ("dim_terumo_category", "terumo_category"), [("fact_market_potential", "Pot Realized Sales EUR"), ("fact_market_potential", "Pot Gap EUR")]),
        chart_visual("revenue_share_bar", "clusteredBarChart", MARGIN, 374, chart_w, 140, "Category revenue share", ("dim_terumo_category", "terumo_category"), [("fact_market_potential", "MS Category Revenue Share")]),
        chart_visual("ri_bar", "clusteredBarChart", MARGIN + chart_w + GAP, 374, chart_w, 140, "Category realization index", ("dim_terumo_category", "terumo_category"), [("fact_market_potential", "MS Realization Index")]),
        table_visual("detail_table", MARGIN, 526, PAGE_WIDTH - 2 * MARGIN, 138, "Category detail", [("dim_terumo_category", "terumo_category", False), ("fact_market_potential", "Pot Realized Sales EUR", True), ("fact_market_potential", "MS Category Revenue Share", True), ("fact_market_potential", "Pot Realized Qty", True), ("fact_market_potential", "Pot Total Potential Units", True), ("fact_market_potential", "MS Estimated Share %", True), ("fact_market_potential", "MS Realization Index", True), ("fact_market_potential", "Pot Gap EUR", True), ("fact_market_potential", "MS Revenue-Weighted Category Priority", True), ("fact_market_potential", "MS Action Flag", True)]),
    ])
    pages.append(p)

    p = {"name": "WhereToGoCustomers", "displayName": "Where to go — Customers", "visuals": [textbox_visual("title", MARGIN, 12, 420, 28, "Where to go — Customers", 15)]}
    width = (PAGE_WIDTH - 2 * MARGIN - 3 * GAP) // 4
    for idx, meta in enumerate([("country_slicer", "Country", "Dim_Cust", "Country Text"), ("segment_slicer", "Customer segment", "fact_market_potential", "customer_segment"), ("category_slicer", "Product category", "dim_terumo_category", "terumo_category"), ("customer_slicer", "Customer (optional)", "Dim_Cust", "Customer Name")]):
        name, title, entity, field = meta
        p["visuals"].append(slicer_visual(name, MARGIN + idx * (width + GAP), 48, width, 40, title, entity, field))
    for idx, (name, title, measure) in enumerate([
        ("real_sales", "Pot realized sales EUR", "Pot Realized Sales EUR"),
        ("real_qty", "Pot realized qty", "Pot Realized Qty"),
        ("national_ri", "MS national realization %", "MS National Realization Pct"),
        ("top20", "Revenue concentration top20", "MS Revenue Concentration Top20"),
    ]):
        p["visuals"].append(card_visual(name, MARGIN + idx * (four_card_width + GAP), 98, four_card_width, 72, title, "fact_market_potential", measure))
    scatter_w = int((PAGE_WIDTH - 2 * MARGIN - GAP) * 0.58)
    table_w = PAGE_WIDTH - 2 * MARGIN - GAP - scatter_w
    p["visuals"].extend([
        scatter_visual("customer_scatter", MARGIN, 182, scatter_w, 340, "Customer opportunity scatter", ("fact_market_potential", "Pot Realized Sales EUR"), ("fact_market_potential", "MS Realization Index"), ("fact_market_potential", "MS Weighted Opportunity Score"), ("Dim_Cust", "Customer Name")),
        textbox_visual("quadrant_notes", MARGIN, 530, scatter_w, 48, "Top-right protect. Bottom-right grow urgently. Top-left maintain. Bottom-left grow selectively.", 9, "#5D6770"),
        table_visual("customer_table", MARGIN + scatter_w + GAP, 182, table_w, 396, "Customer detail", [("Dim_Cust", "Customer Name", False), ("fact_market_potential", "Pot Realized Sales EUR", True), ("fact_market_potential", "MS Customer Revenue Share", True), ("fact_market_potential", "Pot Realized Qty", True), ("fact_market_potential", "MS Realization Index", True), ("fact_market_potential", "MS Category Coverage", True), ("fact_market_potential", "MS Whitespace Count", True), ("fact_market_potential", "Pot Gap EUR", True), ("fact_market_potential", "MS Account Priority Score", True), ("fact_market_potential", "MS Customer Action Badge", True)]),
    ])
    pages.append(p)

    p = {"name": "HowToWinInThisCategory", "displayName": "How to win — In this category", "visuals": [textbox_visual("title", MARGIN, 12, 500, 28, "How to win — In this category", 15), textbox_visual("back_hint", PAGE_WIDTH - 120, 12, 100, 24, "Back", 10, "#185FA5")]}
    for idx, meta in enumerate([("country_slicer", "Country", "Dim_Cust", "Country Text"), ("segment_slicer", "Customer segment", "fact_market_potential", "customer_segment"), ("category_slicer", "Product category (single)", "dim_terumo_category", "terumo_category")]):
        name, title, entity, field = meta
        p["visuals"].append(slicer_visual(name, MARGIN + idx * (three_slicer_width + GAP), 48, three_slicer_width, 40, title, entity, field))
    for idx, (name, title, measure) in enumerate([
        ("real_sales", "Pot realized sales EUR", "Pot Realized Sales EUR"),
        ("revenue_share", "Category revenue share", "MS Category Revenue Share"),
        ("customer_count", "Category customer count", "MS Category Customer Count"),
        ("whitespace_count", "Whitespace customers", "MS Category Whitespace Customers"),
        ("ri", "MS realization index", "MS Realization Index"),
    ]):
        p["visuals"].append(card_visual(name, MARGIN + idx * (five_card_width + GAP), 98, five_card_width, 72, title, "fact_market_potential", measure))
    p["visuals"].extend([
        chart_visual("customer_gap_bar", "clusteredBarChart", MARGIN, 182, PAGE_WIDTH - 2 * MARGIN, 170, "Top customer gaps in category", ("Dim_Cust", "Customer Name"), [("fact_market_potential", "Pot Realized Qty"), ("fact_market_potential", "Pot Gap Units")]),
        table_visual("category_customer_table", MARGIN, 364, PAGE_WIDTH - 2 * MARGIN, 300, "Customer detail in category", [("Dim_Cust", "Customer Name", False), ("fact_market_potential", "customer_segment", False), ("Dim_Cust", "Country Text", False), ("fact_market_potential", "Pot Realized Qty", True), ("fact_market_potential", "Pot Realized Sales EUR", True), ("fact_market_potential", "MS Realization Index", True), ("fact_market_potential", "Pot Gap Units", True), ("fact_market_potential", "Pot Gap EUR", True), ("fact_market_potential", "MS Customer Priority in Category", True), ("fact_market_potential", "MS Customer Action in Category", True)]),
    ])
    pages.append(p)

    p = {"name": "HowToWinInThisAccount", "displayName": "How to win — In this account", "visuals": [textbox_visual("title", MARGIN, 12, 500, 28, "How to win — In this account", 15), textbox_visual("back_hint", PAGE_WIDTH - 120, 12, 100, 24, "Back", 10, "#185FA5")]}
    five_slicer_w = (PAGE_WIDTH - 2 * MARGIN - 4 * GAP) // 5
    for idx, meta in enumerate([("country_slicer", "Country", "Dim_Cust", "Country Text"), ("segment_slicer", "Customer segment", "fact_market_potential", "customer_segment"), ("category_slicer", "Product category", "dim_terumo_category", "terumo_category"), ("customer_slicer", "Customer (single)", "Dim_Cust", "Customer Name"), ("target_ri", "Target RI", "Target RI", "Value")]):
        name, title, entity, field = meta
        p["visuals"].append(slicer_visual(name, MARGIN + idx * (five_slicer_w + GAP), 48, five_slicer_w, 40, title, entity, field))
    for idx, (name, title, measure) in enumerate([
        ("real_sales", "Pot realized sales EUR", "Pot Realized Sales EUR"),
        ("real_qty", "Pot realized qty", "Pot Realized Qty"),
        ("ri", "MS realization index", "MS Realization Index"),
        ("strength", "Customer strength badge", "MS Customer Strength Badge"),
        ("coverage", "Category coverage", "MS Category Coverage"),
        ("whitespace", "Whitespace count", "MS Whitespace Count"),
    ]):
        p["visuals"].append(card_visual(name, MARGIN + idx * (six_card_width + GAP), 98, six_card_width, 72, title, "fact_market_potential", measure))
    top_split_h = 168
    mix_w = int((PAGE_WIDTH - 2 * MARGIN - GAP) * 0.46)
    ri_w = PAGE_WIDTH - 2 * MARGIN - GAP - mix_w
    p["visuals"].extend([
        chart_visual("ri_by_category", "clusteredBarChart", MARGIN, 182, ri_w, top_split_h, "Realization by category", ("dim_terumo_category", "terumo_category"), [("fact_market_potential", "MS Realization Index")]),
        table_visual("mix_table", MARGIN + ri_w + GAP, 182, mix_w, top_split_h, "Category mix analysis", [("dim_terumo_category", "terumo_category", False), ("fact_market_potential", "MS Customer Category Mix", True), ("fact_market_potential", "MS National Category Mix", True), ("fact_market_potential", "MS Mix Index", True), ("fact_market_potential", "MS Realization Index", True), ("fact_market_potential", "MS Customer Action Badge", True), ("fact_market_potential", "MS Benchmark Level", True)]),
        textbox_visual("growth_header", MARGIN, 362, 320, 24, "Growth targets", 12, "#BA7517"),
        card_visual("units_50", MARGIN, 392, four_card_width, 64, "Units to RI 50", "fact_market_potential", "MS Units to Reach RI 50"),
        card_visual("units_75", MARGIN + (four_card_width + GAP), 392, four_card_width, 64, "Units to RI 75", "fact_market_potential", "MS Units to Reach RI 75"),
        card_visual("units_100", MARGIN + 2 * (four_card_width + GAP), 392, four_card_width, 64, "Units to RI 100", "fact_market_potential", "MS Units to Reach RI 100"),
        card_visual("units_150", MARGIN + 3 * (four_card_width + GAP), 392, four_card_width, 64, "Units to RI 150", "fact_market_potential", "MS Units to Reach RI 150"),
        chart_visual("target_gap_bar", "stackedBarChart", MARGIN, 468, ri_w, 196, "Current vs gap to target", ("dim_terumo_category", "terumo_category"), [("fact_market_potential", "Pot Realized Qty"), ("fact_market_potential", "MS Units to Target")]),
        table_visual("growth_table", MARGIN + ri_w + GAP, 468, mix_w, 196, "Growth target detail", [("dim_terumo_category", "terumo_category", False), ("fact_market_potential", "Pot Realized Qty", True), ("fact_market_potential", "Pot Total Potential Units", True), ("fact_market_potential", "MS Realization Index", True), ("fact_market_potential", "MS Units to Target", True), ("fact_market_potential", "MS Current vs Target Status", True), ("fact_market_potential", "Pot Gap EUR", True), ("fact_market_potential", "MS Action Flag", True)]),
    ])
    pages.append(p)

    return pages


def write_report_project() -> None:
    if REPORT_DIR.exists():
        shutil.rmtree(REPORT_DIR)
    write_json(REPORT_DIR / ".platform", {"$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json", "metadata": {"type": "Report", "displayName": PROJECT_NAME}, "config": {"version": "2.0", "logicalId": new_guid()}})
    write_json(REPORT_DIR / "definition.pbir", {"$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json", "version": "4.0", "datasetReference": {"byPath": {"path": f"../{MODEL_DIR.name}"}}})
    write_json(REPORT_DIR / "definition" / "report.json", {"$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.2.0/schema.json", "themeCollection": {"customTheme": {"name": "terumo_light.json", "reportVersionAtImport": {"visual": "1.8.95", "report": "2.0.95", "page": "1.3.95"}, "type": "RegisteredResources"}}, "resourcePackages": [{"name": "RegisteredResources", "type": "RegisteredResources", "items": [{"name": "terumo_light.json", "path": "terumo_light.json", "type": "CustomTheme"}]}], "settings": {"useStylableVisualContainerHeader": True, "defaultDrillFilterOtherVisuals": True, "useEnhancedTooltips": False}})
    write_json(REPORT_DIR / "definition" / "version.json", {"$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json", "version": "2.0.0"})
    write_json(REPORT_DIR / "StaticResources" / "RegisteredResources" / "terumo_light.json", theme_payload())

    pages = page_definitions()
    write_json(REPORT_DIR / "definition" / "pages" / "pages.json", {"$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json", "pageOrder": [page["name"] for page in pages], "activePageName": pages[0]["name"]})
    for page in pages:
        page_root = REPORT_DIR / "definition" / "pages" / page["name"]
        write_json(page_root / "page.json", page_json(page["name"], page["displayName"]))
        for visual in page["visuals"]:
            write_json(page_root / "visuals" / visual["name"] / "visual.json", visual)


def build_readme() -> None:
    content = """
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
    python "C:\\Users\\adebo\\reports\\potential db\\scripts\\build_potential_dashboard_project.py"
    ```
    """
    write_text(ROOT / "README.md", textwrap.dedent(content))


def summarize() -> None:
    visual_count = len(list((REPORT_DIR / "definition" / "pages").rglob("visual.json")))
    print(f"Built {PBIP_NAME}")
    print(f"Semantic model: {MODEL_DIR}")
    print(f"Report visuals: {visual_count}")


def main() -> None:
    build_pbip_root()
    model = load_model()
    apply_measure_updates(model)
    rebind_dummy_partitions(model)
    write_semantic_model(model)
    write_report_project()
    build_readme()
    summarize()


if __name__ == "__main__":
    main()
