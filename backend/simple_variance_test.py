#!/usr/bin/env python3
"""
Simple test of variance calculations without Django dependencies
"""

import math
import random

def kelly_criterion(win_rate: float, average_roi: float) -> float:
    """Calculate optimal bet sizing using Kelly Criterion"""
    if win_rate <= 0 or average_roi <= 0:
        return 0.0
    
    # Net odds when winning
    b = average_roi
    p = win_rate
    q = 1 - win_rate
    
    kelly_fraction = (p * b - q) / b if b > 0 else 0.0
    return max(0.0, min(1.0, kelly_fraction))

def risk_of_ruin_formula(bankroll: float, buy_in: float, win_rate: float, average_roi: float) -> float:
    """Calculate risk of ruin using corrected formula"""
    print(f"DEBUG: bankroll={bankroll}, buy_in={buy_in}, win_rate={win_rate}, roi={average_roi}")
    
    if bankroll <= 0 or buy_in <= 0 or win_rate <= 0:
        print("DEBUG: Invalid inputs")
        return 1.0
    
    # Corrected edge calculation
    edge = win_rate * (2 + average_roi) - 1
    print(f"DEBUG: edge={edge}")
    
    if edge <= 0:
        print("DEBUG: No edge, returning 1.0")
        return 1.0
    
    buy_ins = bankroll / buy_in
    print(f"DEBUG: buy_ins={buy_ins}")
    
    try:
        ratio = (1 - edge) / (1 + edge)
        ror = ratio ** buy_ins
        print(f"DEBUG: ratio={ratio}, ror={ror}")
        return min(1.0, max(0.0, ror))
    except:
        return 1.0 if edge <= 0 else 0.0

def test_scenarios():
    print("=" * 60)
    print("SIMPLE VARIANCE TEST - REALISTIC SCENARIOS")
    print("=" * 60)
    
    scenarios = [
        {
            "name": "PROFITABLE PLAYER",
            "desc": "15% win rate, 800% ROI",
            "bankroll": 10000,
            "buy_in": 100,
            "win_rate": 0.15,
            "roi": 8.0
        },
        {
            "name": "MARGINAL PLAYER", 
            "desc": "12% win rate, 600% ROI",
            "bankroll": 5000,
            "buy_in": 500,
            "win_rate": 0.12,
            "roi": 6.0
        },
        {
            "name": "LOSING PLAYER",
            "desc": "10% win rate, 200% ROI", 
            "bankroll": 10000,
            "buy_in": 100,
            "win_rate": 0.10,
            "roi": 2.0
        },
        {
            "name": "BREAK-EVEN PLAYER",
            "desc": "14.3% win rate, 600% ROI",
            "bankroll": 10000,
            "buy_in": 100,
            "win_rate": 0.143,
            "roi": 6.0
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{i}. {scenario['name']}:")
        print(f"   {scenario['desc']}")
        print(f"   Bankroll: ${scenario['bankroll']:,}, Buy-in: ${scenario['buy_in']}")
        
        ror = risk_of_ruin_formula(
            scenario['bankroll'], 
            scenario['buy_in'], 
            scenario['win_rate'], 
            scenario['roi']
        )
        
        kelly = kelly_criterion(scenario['win_rate'], scenario['roi'])
        
        print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
        print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
        print(f"   Kelly Recommended: ${scenario['bankroll'] * kelly:.2f}")
        
        # Calculate edge for verification
        edge = scenario['win_rate'] * (2 + scenario['roi']) - 1
        print(f"   Edge: {edge:.4f} ({edge*100:.2f}%)")
        
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_scenarios()