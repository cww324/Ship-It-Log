#!/usr/bin/env python3
"""
Debug script to test variance calculator with known scenarios
"""

import sys
import os
import django

# Add the backend directory to Python path
sys.path.append('/home/charlie/workspace/python/Capstone-Project-2/Ship-It-Log/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shipitlog.settings')
django.setup()

from api.utils.variance_calculator import VarianceCalculator

def test_known_scenarios():
    """Test risk of ruin calculations with known scenarios"""
    
    print("=" * 60)
    print("VARIANCE CALCULATOR DEBUG TEST")
    print("=" * 60)
    
    # Test Case 1: Conservative scenario (should have low RoR)
    print("\n1. CONSERVATIVE SCENARIO:")
    print("   Bankroll: $10,000, Buy-in: $100, Win Rate: 15%, ROI: 50%")
    bankroll = 10000
    buy_in = 100
    win_rate = 0.15
    roi = 0.50
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    print(f"   Kelly Recommended Buy-in: ${bankroll * kelly:.2f}")
    
    # Test Case 2: Aggressive scenario (should have higher RoR)
    print("\n2. AGGRESSIVE SCENARIO:")
    print("   Bankroll: $5,000, Buy-in: $500, Win Rate: 12%, ROI: 80%")
    bankroll = 5000
    buy_in = 500
    win_rate = 0.12
    roi = 0.80
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    print(f"   Kelly Recommended Buy-in: ${bankroll * kelly:.2f}")
    
    # Test Case 3: No edge scenario (should have 100% RoR)
    print("\n3. NO EDGE SCENARIO:")
    print("   Bankroll: $10,000, Buy-in: $100, Win Rate: 10%, ROI: 0%")
    bankroll = 10000
    buy_in = 100
    win_rate = 0.10
    roi = 0.00
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    
    # Test Case 4: High ROI tournament scenario
    print("\n4. HIGH ROI TOURNAMENT SCENARIO:")
    print("   Bankroll: $20,000, Buy-in: $200, Win Rate: 8%, ROI: 300%")
    bankroll = 20000
    buy_in = 200
    win_rate = 0.08
    roi = 3.00  # 300% ROI (common in large tournaments)
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    print(f"   Kelly Recommended Buy-in: ${bankroll * kelly:.2f}")
    
    # Test Case 5: Monte Carlo comparison
    print("\n5. MONTE CARLO COMPARISON:")
    print("   Comparing analytical formula vs Monte Carlo simulation")
    bankroll = 10000
    buy_in = 100
    win_rate = 0.15
    roi = 0.50
    
    analytical_ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    monte_carlo_results = VarianceCalculator.monte_carlo_simulation(
        bankroll, buy_in, win_rate, roi, 1000, 1000  # Smaller simulation for speed
    )
    
    print(f"   Analytical RoR: {analytical_ror:.4f} ({analytical_ror*100:.2f}%)")
    print(f"   Monte Carlo RoR: {monte_carlo_results['risk_of_ruin']:.4f} ({monte_carlo_results['risk_of_ruin']*100:.2f}%)")
    print(f"   Difference: {abs(analytical_ror - monte_carlo_results['risk_of_ruin']):.4f}")
    
    print("\n" + "=" * 60)
    print("DEBUG TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_known_scenarios()