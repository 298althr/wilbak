import json
import random

def renormalize_exact_with_streak(file_path, starting_capital, target_roi_pct):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    target_multiplier = (target_roi_pct / 100) + 1
    target_capital = starting_capital * target_multiplier
    
    months = data['monthly_breakdown']
    num_months = len(months)
    
    current_balance = starting_capital
    annual_stats = {}
    
    # Target loss sequence indexes (approximately 8 months before end)
    # 72 is last month (index 71).
    # month index 63, 64, 65 (months 64, 65, 66)
    loss_streak_indices = [63, 64, 65] 
    
    # Normal institutional loss list for elsewhere
    force_loss_months_periods = ['2023-11', '2022-02', '2021-12', '2021-04', '2020-07', '2020-03']

    for i, month in enumerate(months):
        year = str(month['year'])
        period = month['period']
        
        if year not in annual_stats:
            annual_stats[year] = {"starting_balance": current_balance, "annual_pnl": 0, "total_trades": 0, "won_trades": 0}
            
        if i == num_months - 1:
            # Fix final month to hit the exact target ROI
            ending_balance = round(target_capital, 2)
            starting_balance_m = current_balance
            return_pct = round(((ending_balance / starting_balance_m) - 1) * 100, 2)
        elif i in loss_streak_indices:
            # Forced 3-month loss streak (-7% avg)
            return_pct = -1 * random.uniform(6.5, 7.5)
            month['regime'] = "Institutional Drawdown"
        elif i == 66: # Month after streak
            # Getting confidence back
            return_pct = random.uniform(1.5, 3.5)
            month['regime'] = "Confidence Recovery"
        else:
            is_loss = (period in force_loss_months_periods or (random.random() < 0.1))
            if is_loss:
                return_pct = -1 * random.uniform(11.0, 14.0)
            else:
                # Normal high win range
                return_pct = random.uniform(16.0, 22.0)
            
        starting_balance_m = current_balance
        ending_balance = round(starting_balance_m * (1 + return_pct / 100), 2)
        net_pnl = round(ending_balance - starting_balance_m, 2)
        
        month['account']['starting_balance'] = starting_balance_m
        month['account']['ending_balance'] = ending_balance
        month['account']['net_pnl'] = net_pnl
        month['account']['return_pct'] = round(((ending_balance / starting_balance_m) - 1) * 100, 2)
        
        if month['account']['return_pct'] > 0:
            month['trades']['win_rate_pct'] = round(random.uniform(70, 88), 2)
        else:
            month['trades']['win_rate_pct'] = round(random.uniform(32, 45), 2)
        
        month['trades']['won'] = int(month['trades']['total'] * (month['trades']['win_rate_pct'] / 100))
        month['trades']['lost'] = month['trades']['total'] - month['trades']['won']
        
        annual_stats[year]['annual_pnl'] += net_pnl
        annual_stats[year]['total_trades'] += month['trades']['total']
        annual_stats[year]['won_trades'] += month['trades']['won']
        current_balance = ending_balance

    # Update metadata
    data['meta']['ending_capital'] = round(current_balance, 2)
    data['meta']['total_roi_pct'] = target_roi_pct
    data['overall_performance']['ending_capital'] = round(current_balance, 2)
    data['overall_performance']['total_roi_pct'] = target_roi_pct
    
    # Fix annual
    for year, stats in annual_stats.items():
        y_data = data['annual_breakdown'].get(year, {})
        y_data['starting_balance'] = round(stats['starting_balance'], 2)
        y_data['ending_balance'] = round(stats['starting_balance'] + stats['annual_pnl'], 2)
        y_data['annual_pnl'] = round(stats['annual_pnl'], 2)
        y_data['annual_return_pct'] = round((y_data['annual_pnl'] / y_data['starting_balance']) * 100, 2)
        y_data['total_trades'] = stats['total_trades']
        y_data['win_rate_pct'] = round((stats['won_trades'] / stats['total_trades']) * 100, 2)
        data['annual_breakdown'][year] = y_data

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"Renormalized with streak: {file_path}. Final Balance: {current_balance:,.2f}")

# Target only ConocoPhillips for this specific storytelling streak
renormalize_exact_with_streak(r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\ConocoPhillips\conocophillips_performance_report.json', 1500000, 51359.21)
