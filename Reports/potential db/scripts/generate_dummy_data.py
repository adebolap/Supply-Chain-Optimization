"""
generate_dummy_data.py
Generates realistic dummy data CSVs for all tables in the TIS Market Potential model.
Each CSV matches the exact column names in the .bim schema.

Usage:
    python generate_dummy_data.py --output-dir ./data

Output files:
    dim_terumo_category.csv
    dim_procedure.csv
    dim_cust.csv
    shp_dim_country_hierarchy.csv
    dim_customer_market.csv
    bridge_procedure_to_terumo.csv
    map_product_to_terumo_category.csv
    fact_market_potential.csv
    sales_category.csv
    target_ri.csv
    data_sales.csv              (minimal DATA table subset for reconciliation)
    mapping_estimates_detail.csv
"""

import csv
import os
import random
import argparse
from itertools import product as cartesian_product

random.seed(42)

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
OUTPUT_DIR = "./data"

# ─── REFERENCE DATA ───────────────────────────────────────────────────────────

TERUMO_CATEGORIES = [
    "Guiding Catheters",
    "Guide Wires",
    "PTCA Balloon Catheters",
    "Drug-Eluting Stents",
    "Diagnostic Catheters",
    "Microcatheters",
    "Introducer Sheaths",
    "Hemostasis Valves",
    "Inflation Devices",
    "Radial Access Kits",
]

PROCEDURE_GROUPS = [
    "PCI - Coronary",
    "PCI - Complex",
    "Diagnostic Angiography",
    "Peripheral Intervention",
    "Neurovascular Intervention",
    "Structural Heart",
    "Electrophysiology",
]

# Which procedures drive which categories (and usage rate + units per procedure)
PROC_TO_CAT_BRIDGE = [
    # (procedure_group, terumo_category, qty_units_per_procedure, usage_rate_final)
    ("PCI - Coronary",           "Guiding Catheters",        1.2,  0.95),
    ("PCI - Coronary",           "Guide Wires",              2.0,  0.98),
    ("PCI - Coronary",           "PTCA Balloon Catheters",   1.5,  0.85),
    ("PCI - Coronary",           "Drug-Eluting Stents",      1.3,  0.70),
    ("PCI - Coronary",           "Inflation Devices",        1.0,  0.90),
    ("PCI - Coronary",           "Hemostasis Valves",        1.0,  0.80),
    ("PCI - Coronary",           "Radial Access Kits",       1.0,  0.60),
    ("PCI - Complex",            "Guiding Catheters",        1.5,  0.98),
    ("PCI - Complex",            "Guide Wires",              3.0,  0.99),
    ("PCI - Complex",            "PTCA Balloon Catheters",   2.0,  0.90),
    ("PCI - Complex",            "Drug-Eluting Stents",      2.0,  0.80),
    ("PCI - Complex",            "Microcatheters",           1.0,  0.65),
    ("Diagnostic Angiography",   "Diagnostic Catheters",     2.0,  0.95),
    ("Diagnostic Angiography",   "Guide Wires",              1.5,  0.90),
    ("Diagnostic Angiography",   "Introducer Sheaths",       1.0,  0.85),
    ("Diagnostic Angiography",   "Hemostasis Valves",        1.0,  0.70),
    ("Diagnostic Angiography",   "Radial Access Kits",       1.0,  0.50),
    ("Peripheral Intervention",  "Guide Wires",              2.5,  0.90),
    ("Peripheral Intervention",  "Introducer Sheaths",       1.5,  0.80),
    ("Peripheral Intervention",  "PTCA Balloon Catheters",   1.0,  0.60),
    ("Neurovascular Intervention","Microcatheters",          2.0,  0.95),
    ("Neurovascular Intervention","Guide Wires",             2.0,  0.90),
    ("Structural Heart",         "Introducer Sheaths",       2.0,  0.85),
    ("Structural Heart",         "Guide Wires",              1.0,  0.70),
    ("Electrophysiology",        "Diagnostic Catheters",     3.0,  0.80),
    ("Electrophysiology",        "Introducer Sheaths",       1.0,  0.75),
]

COUNTRIES = [
    # (code, iso2, name, text, region, cluster, branch_code, branch_name, direct_distrib)
    ("DE", "DE", "Germany",        "Germany",        "Central Europe",  "DACH",       "1000", "TIS DE", "Direct"),
    ("FR", "FR", "France",         "France",         "Western Europe",  "France",     "2000", "TIS FR", "Direct"),
    ("GB", "GB", "United Kingdom", "United Kingdom", "Northern Europe", "UK-IE",      "3000", "TIS UK", "Direct"),
    ("IT", "IT", "Italy",          "Italy",          "Southern Europe", "Italy",      "4000", "TIS IT", "Direct"),
    ("ES", "ES", "Spain",          "Spain",          "Southern Europe", "Iberia",     "5000", "TIS ES", "Direct"),
    ("NL", "NL", "Netherlands",    "Netherlands",    "Western Europe",  "Benelux",    "6000", "TIS NL", "Direct"),
    ("BE", "BE", "Belgium",        "Belgium",        "Western Europe",  "Benelux",    "6000", "TIS NL", "Direct"),
    ("PL", "PL", "Poland",         "Poland",         "Eastern Europe",  "CEE",        "7000", "TIS PL", "Distributor"),
    ("TR", "TR", "Turkey",         "Turkey",         "MENA",            "Turkey",     "8000", "TIS TR", "Direct"),
    ("SE", "SE", "Sweden",         "Sweden",         "Northern Europe", "Nordics",    "9000", "TIS SE", "Direct"),
]

SEGMENTS = ["University Hospital", "Public Hospital", "Private Clinic", "Heart Center"]

PRODUCT_GROUPS = [
    # (product_group_text, product_subgroup_text, terumo_category, profit_center)
    ("Coronary Guidewires",     "Runthrough",        "Guide Wires",             "PC101"),
    ("Coronary Guidewires",     "Sion",              "Guide Wires",             "PC101"),
    ("Coronary Guidewires",     "Glidewire Adv",     "Guide Wires",             "PC101"),
    ("Guiding Catheters",       "Heartrail",         "Guiding Catheters",       "PC102"),
    ("Guiding Catheters",       "Vista Brite Tip",   "Guiding Catheters",       "PC102"),
    ("Balloon Catheters",       "Ryurei",            "PTCA Balloon Catheters",  "PC103"),
    ("Balloon Catheters",       "Hiryu Plus",        "PTCA Balloon Catheters",  "PC103"),
    ("Drug-Eluting Stents",     "Ultimaster Tansei", "Drug-Eluting Stents",     "PC104"),
    ("Diagnostic Catheters",    "Optitorque",        "Diagnostic Catheters",    "PC105"),
    ("Microcatheters",          "Progreat",          "Microcatheters",          "PC106"),
    ("Microcatheters",          "Finecross",         "Microcatheters",          "PC106"),
    ("Access",                  "Glidesheath Slender","Introducer Sheaths",     "PC107"),
    ("Access",                  "RadiForce",         "Introducer Sheaths",      "PC107"),
    ("Hemostasis",              "TR Band",           "Hemostasis Valves",       "PC108"),
    ("Inflation",               "Kushi III",         "Inflation Devices",       "PC109"),
    ("Radial Kits",             "Radial Kit Pro",    "Radial Access Kits",      "PC110"),
]

# ─── ASP REFERENCE (EUR per unit, by category) ─────────────────────────────
CATEGORY_ASP = {
    "Guiding Catheters":        28.0,
    "Guide Wires":              18.0,
    "PTCA Balloon Catheters":   95.0,
    "Drug-Eluting Stents":     420.0,
    "Diagnostic Catheters":     22.0,
    "Microcatheters":          145.0,
    "Introducer Sheaths":       12.0,
    "Hemostasis Valves":         8.5,
    "Inflation Devices":        15.0,
    "Radial Access Kits":       35.0,
}


def generate_customers(n_per_country=12):
    """Generate realistic hospital/clinic names per country."""
    prefixes = {
        "DE": ["Universitätsklinikum", "Klinikum", "Herzzentrum", "Städtisches Krankenhaus", "St. Vinzenz-Hospital"],
        "FR": ["CHU", "Hôpital", "Clinique", "Centre Cardiologique", "Institut Cardiovasculaire"],
        "GB": ["Royal", "St. Thomas'", "University Hospital", "Queen Elizabeth", "King's College"],
        "IT": ["Ospedale", "Policlinico", "Centro Cardiologico", "Istituto Clinico", "Fondazione"],
        "ES": ["Hospital Universitario", "Clínica", "Hospital General", "Centro Médico", "Hospital Clínic"],
        "NL": ["AMC", "Erasmus MC", "UMC", "Catharina Ziekenhuis", "Sint Antonius"],
        "BE": ["UZ", "CHU", "AZ", "OLV Ziekenhuis", "Cliniques Universitaires"],
        "PL": ["Szpital Kliniczny", "Instytut Kardiologii", "Centrum Medyczne", "Szpital Wojewódzki", "Klinika Kardiochirurgii"],
        "TR": ["Üniversitesi Hastanesi", "Kalp Merkezi", "Devlet Hastanesi", "Eğitim Araştırma", "Özel Hastane"],
        "SE": ["Karolinska", "Sahlgrenska", "Skånes Universitetssjukhus", "Uppsala Akademiska", "Danderyds sjukhus"],
    }
    cities = {
        "DE": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf", "Leipzig", "Dresden", "Hannover", "Essen", "Freiburg"],
        "FR": ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Strasbourg", "Nantes", "Rennes", "Montpellier", "Grenoble", "Nice"],
        "GB": ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Bristol", "Oxford", "Cambridge", "Edinburgh", "Glasgow", "Cardiff", "Brighton"],
        "IT": ["Milan", "Rome", "Naples", "Turin", "Florence", "Bologna", "Genoa", "Padua", "Verona", "Catania", "Bari", "Palermo"],
        "ES": ["Madrid", "Barcelona", "Valencia", "Seville", "Bilbao", "Malaga", "Zaragoza", "Murcia", "Santiago", "Valladolid", "Salamanca", "Granada"],
        "NL": ["Amsterdam", "Rotterdam", "Utrecht", "Eindhoven", "Groningen", "Nijmegen", "Leiden", "Maastricht", "Tilburg", "Den Haag", "Breda", "Arnhem"],
        "BE": ["Brussels", "Antwerp", "Ghent", "Leuven", "Liège", "Bruges", "Charleroi", "Namur", "Hasselt", "Mechelen", "Kortrijk", "Mons"],
        "PL": ["Warsaw", "Krakow", "Wroclaw", "Poznan", "Gdansk", "Katowice", "Lodz", "Lublin", "Bialystok", "Szczecin", "Bydgoszcz", "Rzeszow"],
        "TR": ["Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Adana", "Konya", "Gaziantep", "Mersin", "Kayseri", "Eskisehir", "Trabzon"],
        "SE": ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Linköping", "Örebro", "Lund", "Umeå", "Västerås", "Karlstad", "Jönköping", "Norrköping"],
    }
    
    customers = []
    cust_id = 100000
    for country_iso2, city_list in cities.items():
        pfx_list = prefixes[country_iso2]
        for i in range(min(n_per_country, len(city_list))):
            cust_id += 1
            city = city_list[i]
            prefix = pfx_list[i % len(pfx_list)]
            name = f"{prefix} {city}"
            segment = random.choice(SEGMENTS)
            # Larger hospitals (University/Heart Center) get more procedures
            size_factor = 1.0
            if "Universit" in prefix or "Heart" in prefix or "Herz" in prefix or "CHU" in prefix or "Cardio" in prefix or "Karolinska" in prefix:
                size_factor = 2.5
                segment = "University Hospital"
            elif "Private" in prefix or "Clinique" in prefix or "Clínica" in prefix or "Özel" in prefix:
                size_factor = 0.6
                segment = "Private Clinic"
            
            customers.append({
                "customer_id": str(cust_id),
                "customer_name": name,
                "country_iso2": country_iso2,
                "segment": segment,
                "size_factor": size_factor,
                "city": city,
            })
    return customers


def write_csv(filepath, rows, fieldnames):
    """Write a list of dicts to CSV."""
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✓ {filepath} ({len(rows)} rows)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', default=OUTPUT_DIR)
    args = parser.parse_args()
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print("Generating dummy data for TIS Market Potential model...\n")
    
    # ─── 1. dim_terumo_category ──────────────────────────────────────────
    cat_rows = []
    for i, cat in enumerate(TERUMO_CATEGORIES):
        cat_rows.append({
            "terumo_category": cat,
            "terumo_category_key": f"TC{i+1:03d}",
        })
    write_csv(f"{args.output_dir}/dim_terumo_category.csv", cat_rows,
              ["terumo_category", "terumo_category_key"])
    
    # ─── 2. dim_procedure ────────────────────────────────────────────────
    proc_rows = []
    for i, pg in enumerate(PROCEDURE_GROUPS):
        proc_rows.append({
            "procedure_group": pg,
            "procedure_group_key": f"PG{i+1:03d}",
        })
    write_csv(f"{args.output_dir}/dim_procedure.csv", proc_rows,
              ["procedure_group", "procedure_group_key"])
    
    # Key lookups
    cat_key = {c["terumo_category"]: c["terumo_category_key"] for c in cat_rows}
    proc_key = {p["procedure_group"]: p["procedure_group_key"] for p in proc_rows}
    
    # ─── 3. bridge_procedure_to_terumo ───────────────────────────────────
    bridge_rows = []
    for pg, tc, qty, usage in PROC_TO_CAT_BRIDGE:
        bridge_rows.append({
            "procedure_group_key": proc_key[pg],
            "terumo_category_key": cat_key[tc],
            "procedure_group": pg,
            "terumo_category": tc,
            "qty_units_per_procedure": qty,
            "mapping_row_count": 1,
            "usage_rate_final": usage,
        })
    write_csv(f"{args.output_dir}/bridge_procedure_to_terumo.csv", bridge_rows,
              ["procedure_group_key", "terumo_category_key", "procedure_group",
               "terumo_category", "qty_units_per_procedure", "mapping_row_count",
               "usage_rate_final"])
    
    # ─── 4. map_product_to_terumo_category ───────────────────────────────
    prod_map_rows = []
    for pg_text, psg_text, tc, pc in PRODUCT_GROUPS:
        prod_map_rows.append({
            "product_group_text": pg_text,
            "product_subgroup_text": psg_text,
            "terumo_category": tc,
            "product_group_key": f"PGK_{pg_text[:3].upper()}",
            "product_subgroup_key": f"PSK_{psg_text[:3].upper()}",
            "terumo_category_key": cat_key[tc],
        })
    write_csv(f"{args.output_dir}/map_product_to_terumo_category.csv", prod_map_rows,
              ["product_group_text", "product_subgroup_text", "terumo_category",
               "product_group_key", "product_subgroup_key", "terumo_category_key"])
    
    # ─── 5. Shp_Dim_Country_Hierarchy ────────────────────────────────────
    country_rows = []
    for code, iso2, name, text, region, cluster, bc, bn, dd in COUNTRIES:
        country_rows.append({
            "Country": code,
            "Country Text": text,
            "Region": region,
            "Cluster": cluster,
            "Business Area": f"BA_{code}",
            "Direct/Distrib": dd,
            "Branch Code": bc,
            "Branch Name": bn,
            "Index_Branch_CountryFinalDestination": f"{bc}_{code}",
            "Country Final Destination": code,
            "Country Final Destination Text": text,
        })
    write_csv(f"{args.output_dir}/shp_dim_country_hierarchy.csv", country_rows,
              ["Country", "Country Text", "Region", "Cluster", "Business Area",
               "Direct/Distrib", "Branch Code", "Branch Name",
               "Index_Branch_CountryFinalDestination",
               "Country Final Destination", "Country Final Destination Text"])
    
    country_lookup = {c[1]: c[4] for c in COUNTRIES}  # iso2 → text
    
    # ─── 6. Customers ────────────────────────────────────────────────────
    customers = generate_customers(n_per_country=12)
    
    # dim_cust.csv (matches Dim_Cust schema)
    cust_rows = []
    for c in customers:
        cust_rows.append({
            "Customer": c["customer_id"],
            "Customer Name": c["customer_name"],
            "Customer Account Group Code": "Z001",
            "Customer account group Text": "Hospital",
            "Country": c["country_iso2"],
            "Country Text": country_lookup.get(c["country_iso2"], c["country_iso2"]),
            "Location": c["city"],
            "CITY": c["city"],
            "Language key": c["country_iso2"][:2].lower(),
            "Source System": "SAP",
            "TIS Final Segmenation": c["segment"],  # Note: typo matches .bim
            "Customer Combined": f"{c['customer_id']} - {c['customer_name']}",
            "Final Customer": c["customer_id"],
            "Final Name": c["customer_name"],
            "Final Location": c["city"],
            "GPO Combined": "",
        })
    write_csv(f"{args.output_dir}/dim_cust.csv", cust_rows,
              ["Customer", "Customer Name", "Customer Account Group Code",
               "Customer account group Text", "Country", "Country Text",
               "Location", "CITY", "Language key", "Source System",
               "TIS Final Segmenation", "Customer Combined",
               "Final Customer", "Final Name", "Final Location", "GPO Combined"])
    
    # dim_customer_market.csv
    cm_rows = []
    for c in customers:
        cm_rows.append({
            "customer_id_": c["customer_id"],
            "customer_id": c["customer_id"],
            "customer_name": c["customer_name"],
            "country_iso2": c["country_iso2"],
            "country_text": country_lookup.get(c["country_iso2"], ""),
            "customer_market_key": f"CM_{c['customer_id']}",
        })
    write_csv(f"{args.output_dir}/dim_customer_market.csv", cm_rows,
              ["customer_id_", "customer_id", "customer_name",
               "country_iso2", "country_text", "customer_market_key"])
    
    # ─── 7. fact_market_potential ─────────────────────────────────────────
    # Generate potential for each customer × procedure × category combination
    # Procedure volumes vary by country size and hospital size
    
    country_proc_scale = {
        "DE": 1.8, "FR": 1.5, "GB": 1.4, "IT": 1.3, "ES": 1.0,
        "NL": 0.5, "BE": 0.4, "PL": 0.7, "TR": 0.9, "SE": 0.4,
    }
    
    potential_rows = []
    final_dest_counter = 200000
    
    for cust in customers:
        iso2 = cust["country_iso2"]
        scale = country_proc_scale.get(iso2, 1.0) * cust["size_factor"]
        
        final_dest_counter += 1
        final_dest = str(final_dest_counter)
        final_dest_text = f"FD {cust['customer_name']}"
        
        # Each customer gets a subset of procedures (not all)
        available_procs = random.sample(PROCEDURE_GROUPS, k=random.randint(3, len(PROCEDURE_GROUPS)))
        
        for pg in available_procs:
            # Base procedure volume: 50-800 per year depending on scale
            base_procs = int(random.gauss(300, 120) * scale)
            base_procs = max(20, base_procs)
            
            # Find all categories linked to this procedure
            linked = [(b[1], b[2], b[3]) for b in PROC_TO_CAT_BRIDGE if b[0] == pg]
            n_links = len(linked)
            
            for tc, qty_per_proc, usage_rate in linked:
                # Allocation weight distributes this procedure's volume
                alloc_weight = 1.0 / n_links if n_links > 0 else 1.0
                
                potential_rows.append({
                    "region_group": country_lookup.get(iso2, ""),
                    "country_code": iso2,
                    "country_name": country_lookup.get(iso2, ""),
                    "country_iso2": iso2,
                    "country_text": country_lookup.get(iso2, ""),
                    "customer_id_": cust["customer_id"],
                    "customer_id": cust["customer_id"],
                    "customer_name": cust["customer_name"],
                    "customer_segment": cust["segment"],
                    "Final Destination": final_dest,
                    "Final Destination Text": final_dest_text,
                    "year": "2024",
                    "procedure_group": pg,
                    "terumo_category": tc,
                    "terumo_category_key": cat_key[tc],
                    "qty_units_per_procedure": qty_per_proc,
                    "mapping_row_count": 1,
                    "procedures": base_procs,
                    "usage_rate_final": usage_rate,
                    "mapping_cardinality": n_links,
                    "allocation_weight": round(alloc_weight, 4),
                    "customer_market_key": f"CM_{cust['customer_id']}",
                    "final_destination_key": f"FD_{final_dest}",
                })
    
    write_csv(f"{args.output_dir}/fact_market_potential.csv", potential_rows,
              ["region_group", "country_code", "country_name", "country_iso2",
               "country_text", "customer_id_", "customer_id", "customer_name",
               "customer_segment", "Final Destination", "Final Destination Text",
               "year", "procedure_group", "terumo_category", "terumo_category_key",
               "qty_units_per_procedure", "mapping_row_count", "procedures",
               "usage_rate_final", "mapping_cardinality", "allocation_weight",
               "customer_market_key", "final_destination_key"])
    
    # ─── 8. Sales_Category ───────────────────────────────────────────────
    # Realized sales: each customer buys SOME categories at SOME penetration
    # This creates the realistic pattern where some accounts are champions
    # and others are growth targets
    
    sales_rows = []
    
    for cust in customers:
        iso2 = cust["country_iso2"]
        
        # Decide how many categories this customer buys (3-9 out of 10)
        n_cats_bought = random.randint(3, min(9, len(TERUMO_CATEGORIES)))
        cats_bought = random.sample(TERUMO_CATEGORIES, k=n_cats_bought)
        
        # Customer archetype affects realization level
        archetype = random.choice(["champion", "above_avg", "below_avg", "growth_target"])
        realization_multiplier = {
            "champion": random.uniform(1.2, 2.0),
            "above_avg": random.uniform(0.8, 1.2),
            "below_avg": random.uniform(0.4, 0.8),
            "growth_target": random.uniform(0.05, 0.4),
        }[archetype]
        
        for tc in cats_bought:
            # Find this customer's potential for this category
            matching_potential = [
                r for r in potential_rows
                if r["customer_id"] == cust["customer_id"] and r["terumo_category"] == tc
            ]
            
            if not matching_potential:
                continue
            
            # Calculate potential units for this category
            total_potential_units = sum(
                r["procedures"] * r["qty_units_per_procedure"] * r["usage_rate_final"] * r["allocation_weight"]
                for r in matching_potential
            )
            
            # Realized = potential × some fraction (benchmark-ish × realization)
            # National benchmark would be ~15-35% for most categories
            national_benchmark = random.uniform(0.12, 0.35)
            realized_qty = int(total_potential_units * national_benchmark * realization_multiplier)
            realized_qty = max(0, realized_qty)
            
            if realized_qty == 0:
                continue
            
            # ASP with some customer-level variation (±15%)
            asp = CATEGORY_ASP.get(tc, 25.0) * random.uniform(0.85, 1.15)
            sales_eur = round(realized_qty * asp, 2)
            
            sales_rows.append({
                "Customer Id": cust["customer_id"],
                "Customer Name": cust["customer_name"],
                "Customer Combined": f"{cust['customer_id']} - {cust['customer_name']}",
                "Customer Segment": cust["segment"],
                "CountryIso2": iso2,
                "Country Name": country_lookup.get(iso2, ""),
                "Year": 2025,
                "Terumo Category": tc,
                "Qty Sold": realized_qty,
                "Sales EUR": sales_eur,
            })
    
    write_csv(f"{args.output_dir}/sales_category.csv", sales_rows,
              ["Customer Id", "Customer Name", "Customer Combined",
               "Customer Segment", "CountryIso2", "Country Name",
               "Year", "Terumo Category", "Qty Sold", "Sales EUR"])
    
    # ─── 9. Target RI (what-if parameter) ────────────────────────────────
    target_rows = [{"Value": v} for v in [50, 75, 100, 125, 150]]
    write_csv(f"{args.output_dir}/target_ri.csv", target_rows, ["Value"])
    
    # ─── 10. mapping_estimates_detail ────────────────────────────────────
    mapping_rows = []
    for pg, tc, qty, usage in PROC_TO_CAT_BRIDGE:
        # Find product mapping
        matching_prod = [p for p in PRODUCT_GROUPS if p[2] == tc]
        for prod in matching_prod:
            mapping_rows.append({
                "procedure_group": pg,
                "product_group_text": prod[0],
                "product_subgroup_text": prod[1],
                "profit_center": prod[3],
                "component_family": prod[1],
                "qty_min": max(0.5, qty - 0.5),
                "qty_mode": qty,
                "qty_max": qty + 1.0,
                "assumption_notes": f"Based on clinical protocol for {pg}",
                "confidence": random.choice(["High", "Medium", "Low"]),
                "terumo_category": tc,
                "qty_expected": qty,
                "procedure_group_key": proc_key[pg],
                "terumo_category_key": cat_key[tc],
            })
    write_csv(f"{args.output_dir}/mapping_estimates_detail.csv", mapping_rows,
              ["procedure_group", "product_group_text", "product_subgroup_text",
               "profit_center", "component_family", "qty_min", "qty_mode",
               "qty_max", "assumption_notes", "confidence", "terumo_category",
               "qty_expected", "procedure_group_key", "terumo_category_key"])
    
    # ─── 11. Segmentation tables (Cardio, PI, IO) ───────────────────────
    seg_labels = {
        "Cardio": ["A - Strategic", "B - Important", "C - Standard", "D - Tactical"],
        "PI": ["Tier 1", "Tier 2", "Tier 3"],
        "IO": ["Focus", "Maintain", "Develop", "Not Active"],
    }
    for seg_type, labels in seg_labels.items():
        seg_rows = []
        for c in customers:
            seg_rows.append({
                "SAP Nb": c["customer_id"],
                f"{seg_type} Segmentation": random.choice(labels),
            })
        write_csv(f"{args.output_dir}/segmentation_{seg_type.lower()}.csv",
                  seg_rows, ["SAP Nb", f"{seg_type} Segmentation"])
    
    # ─── SUMMARY ─────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"DUMMY DATA GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"  Customers:         {len(customers)} ({len(set(c['country_iso2'] for c in customers))} countries)")
    print(f"  Categories:        {len(TERUMO_CATEGORIES)}")
    print(f"  Procedures:        {len(PROCEDURE_GROUPS)}")
    print(f"  Potential rows:    {len(potential_rows)}")
    print(f"  Sales rows:        {len(sales_rows)}")
    print(f"  Bridge mappings:   {len(bridge_rows)}")
    print(f"  Product mappings:  {len(prod_map_rows)}")
    print(f"  Output directory:  {args.output_dir}")
    print()
    
    # Distribution stats
    total_sales = sum(r["Sales EUR"] for r in sales_rows)
    total_qty = sum(r["Qty Sold"] for r in sales_rows)
    cats_with_sales = len(set(r["Terumo Category"] for r in sales_rows))
    custs_with_sales = len(set(r["Customer Id"] for r in sales_rows))
    print(f"  Total realized EUR:  €{total_sales:,.0f}")
    print(f"  Total realized qty:  {total_qty:,}")
    print(f"  Categories w/sales:  {cats_with_sales}")
    print(f"  Customers w/sales:   {custs_with_sales}")
    
    # Country breakdown
    print(f"\n  Country breakdown:")
    country_sales = {}
    for r in sales_rows:
        country_sales[r["CountryIso2"]] = country_sales.get(r["CountryIso2"], 0) + r["Sales EUR"]
    for iso2, rev in sorted(country_sales.items(), key=lambda x: -x[1]):
        print(f"    {iso2}: €{rev:>12,.0f}")


if __name__ == "__main__":
    main()
