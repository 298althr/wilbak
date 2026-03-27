import json

def finalize_summaries(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    start = data['overall_performance'].get('starting_capital', data['meta'].get('starting_capital'))
    end = data['meta']['ending_capital']
    profit = round(end - start, 2)
    roi = data['meta']['total_roi_pct']
    
    data['overall_performance']['total_net_profit'] = profit
    data['overall_performance']['total_roi_pct'] = roi
    
    # Check profitable months
    win_months = 0
    loss_months = 0
    for m in data['monthly_breakdown']:
        if m['account']['return_pct'] > 0: win_months += 1
        else: loss_months += 1
    
    data['overall_performance']['profitable_months'] = win_months
    data['overall_performance']['losing_months'] = loss_months
    data['overall_performance']['total_months'] = len(data['monthly_breakdown'])

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

finalize_summaries(r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\ConocoPhillips\conocophillips_performance_report.json')
finalize_summaries(r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\orthom8_performance_report.json')
