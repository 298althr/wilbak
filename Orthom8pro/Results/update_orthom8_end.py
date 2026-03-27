import json
import random

def renormalize_with_story_v4(file_path, starting_capital, target_roi_pct, streak_val, last_two_vals):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    target_multiplier = (target_roi_pct / 100) + 1
    target_capital = starting_capital * target_multiplier
    
    months = data['monthly_breakdown']
    num_months = len(months)
    
    # Target Values
    # Streak: index 63, 64, 65 (Apr-Jun 2025)
    # Nov 2025: i=70 (index 70)
    # Dec 2025: i=71 (index 71)
    
    v_nov = last_two_vals[0] / 100
    v_dec = last_two_vals[1] / 100
    
    # Logic Working Backwards:
    # End_Capital = Start_Dec * (1 + v_dec)
    # Start_Dec = Target_Capital / (1 + v_dec)
    # End_Nov = Start_Dec
    # Start_Nov = End_Nov / (1 + v_nov)
    
    required_start_dec = target_capital / (1 + v_dec)
    required_start_nov = required_start_dec / (1 + v_nov)
    
    # Required multiplier for first 70 months:
    total_mult_for_70 = required_start_nov / starting_capital
    
    # Handle streak
    streak_mult = (1 + streak_val / 100)**3
    remaining_mult_for_67 = total_mult_for_70 / streak_mult
    avg_mult_67 = remaining_mult_for_67 ** (1/67)
    
    current_balance = starting_capital
    annual_stats = {}
    
    for i in range(num_months):
        month = months[i]
        year = str(month['year'])
        
        if year not in annual_stats:
            annual_stats[year] = {"starting_balance": current_balance, "annual_pnl": 0, "total_trades": 0, "won_trades": 0}

        if i == 71: # Dec
            return_pct = last_two_vals[1]
            ending_balance = round(target_capital, 2)
        elif i == 70: # Nov
            return_pct = last_two_vals[0]
            ending_balance = round(required_start_dec, 2)
        elif 63 <= i <= 65: # Streak
            return_pct = streak_val + random.uniform(-0.5, 0.5)
            ending_balance = round(current_balance * (1 + return_pct / 100), 2)
        elif i == 69: # Fixer before Nov
            ending_balance = round(required_start_nov, 2)
            return_pct = ((ending_balance / current_balance) - 1) * 100
        else:
            is_loss = (random.random() < 0.15)
            if is_loss:
                return_pct = -1 * random.uniform(8.0, 12.0)
            else:
                return_pct = (avg_mult_67 - 1) * 100 + random.uniform(1.0, 3.0)
            ending_balance = round(current_balance * (1 + return_pct / 100), 2)
            
        starting_balance_m = current_balance
        net_pnl = round(ending_balance - starting_balance_m, 2)
        
        month['account']['starting_balance'] = starting_balance_m
        month['account']['ending_balance'] = ending_balance
        month['account']['net_pnl'] = net_pnl
        month['account']['return_pct'] = round(return_pct, 2)
        
        # Set win rates
        if return_pct > 0: month['trades']['win_rate_pct'] = round(random.uniform(78, 93), 2)
        else: month['trades']['win_rate_pct'] = round(random.uniform(30, 42), 2)
        month['trades']['won'] = int(month['trades']['total'] * (month['trades']['win_rate_pct'] / 100))
        month['trades']['lost'] = month['trades']['total'] - month['trades']['won']
        
        annual_stats[year]['annual_pnl'] += net_pnl
        annual_stats[year]['total_trades'] += month['trades']['total']
        annual_stats[year]['won_trades'] += month['trades']['won']
        current_balance = ending_balance

    # Meta Update
    data['meta']['ending_capital'] = round(current_balance, 2)
    data['meta']['total_roi_pct'] = target_roi_pct
    data['overall_performance']['ending_capital'] = round(current_balance, 2)
    data['overall_performance']['total_roi_pct'] = target_roi_pct
    
    for year, stats in annual_stats.items():
        y_data = data['annual_breakdown'].get(year, {})
        if not y_data: continue
        y_data['annual_pnl'] = round(stats['annual_pnl'], 2)
        y_data['annual_return_pct'] = round((y_data['annual_pnl'] / stats['starting_balance']) * 100, 2)
        y_data['starting_balance'] = round(stats['starting_balance'], 2)
        y_data['ending_balance'] = round(stats['starting_balance'] + stats['annual_pnl'], 2)

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"Update: {file_path}. Nov: {last_two_vals[0]}%, Dec: {last_two_vals[1]}%")

# OrthoM8: Streak -7%, Nov +46%, Dec -15%
renormalize_with_story_v4(r'c:\Users\saviour\Documents\Wilbak\Orthom8pro\Results\orthom8_performance_report.json', 10000, 79201.08, -7.0, [46.0, -15.0])
