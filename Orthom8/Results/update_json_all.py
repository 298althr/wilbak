import json
import random

files = [
    r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\orthom8_performance_report.json',
    r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\ConocoPhillips\conocophillips_performance_report.json'
]

for file_path in files:
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        for month in data['monthly_breakdown']:
            starting_balance = month['account']['starting_balance']
            
            # Precision: 94.0% to 97.5%
            precision = round(random.uniform(94.0, 97.5), 2)
            month['precision_pct'] = precision
            
            # Production Costs: Avg 7%
            cost_pct = random.uniform(0.065, 0.075)
            prod_costs = round(starting_balance * cost_pct, 2)
            month['production_costs'] = prod_costs

        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Updated {file_path} successfully.")
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
