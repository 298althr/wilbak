import json
import csv
import os

def json_to_csv(json_path, csv_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    monthly_data = data.get('monthly_breakdown', [])
    if not monthly_data:
        print(f"No monthly data found in {json_path}")
        return

    # Extract relevant fields for the frontend
    # period, regime, precision_pct, production_costs, return_pct, ending_balance
    rows = []
    for m in monthly_data:
        rows.append({
            'period': m.get('period', ''),
            'regime': m.get('regime', ''),
            'precision_pct': m.get('precision_pct', 0),
            'production_costs': m.get('production_costs', 0),
            'yield_pct': m.get('account', {}).get('return_pct', 0),
            'balance': m.get('account', {}).get('ending_balance', 0)
        })

    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['period', 'regime', 'precision_pct', 'production_costs', 'yield_pct', 'balance'])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Created {csv_path}")

# Run conversion
ortho_json = r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\orthom8_performance_report.json'
ortho_csv = r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\orthom8_performance.csv'

conoco_json = r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\ConocoPhillips\conocophillips_performance_report.json'
conoco_csv = r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\ConocoPhillips\conocophillips_performance.csv'

json_to_csv(ortho_json, ortho_csv)
json_to_csv(conoco_json, conoco_csv)
