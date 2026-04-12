"""
fix_data_path.py — updates the CSV data folder path in model.bim.
Run on any new machine before opening the .pbip.

Usage:
  python3 fix_data_path.py
  python3 fix_data_path.py "D:\\Reports\\lead-management-dashboard"
"""
import sys, os, json

# ── auto-detect or accept override ──────────────────────────────────────────
if len(sys.argv) > 1:
    NEW_FOLDER = sys.argv[1].rstrip("\\") + "\\"
else:
    # Default: same subfolder relative to this script's location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    NEW_FOLDER = os.path.join(script_dir, "data") + "\\"

BIM = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "LeadManagement.SemanticModel", "model.bim")

with open(BIM, encoding="utf-8") as f:
    raw = f.read()

# Find current hardcoded path inside the M expressions
import re
# M expressions double-escape backslashes: C:\\\\Users\\\\...
# We find the DataFolder line pattern and replace the path portion
pattern = r'(\"    DataFolder = \\\")(.*?)(\\\\\\\")'
matches = re.findall(pattern, raw)

if not matches:
    # Try to find any existing DataFolder line to show user
    sample = re.search(r'DataFolder = \\"(.*?)\\"', raw)
    if sample:
        print(f"Current path: {sample.group(1)}")
    else:
        print("Could not find DataFolder in model.bim — check file manually.")
    sys.exit(1)

# The path in JSON is double-escaped: C:\\Users\\adebo\\ = C:\\\\Users\\\\adebo\\\\
old_path_json = matches[0][1]  # middle capture group
old_path = old_path_json.replace("\\\\\\\\", "\\")

print(f"Old path: {old_path}")
print(f"New path: {NEW_FOLDER}")

# Escape the new path for JSON double-escaping
new_path_json = NEW_FOLDER.replace("\\", "\\\\\\\\")

new_raw = raw.replace(old_path_json, new_path_json)

if new_raw == raw:
    print("No changes needed — path already matches.")
else:
    with open(BIM, "w", encoding="utf-8") as f:
        f.write(new_raw)
    print("model.bim updated successfully.")
    print("Open LeadManagement.pbip in Power BI Desktop and refresh data.")
