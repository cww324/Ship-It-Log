#!/usr/bin/env python3
"""
Debug script to test variance calculator with REALISTIC tournament scenarios
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

def test_realistic_scenarios():
    """Test risk of ruin calculations with REALISTIC tournament scenarios"""
    
    print("=" * 60)
    print("VARIANCE CALCULATOR - REALISTIC TOURNAMENT SCENARIOS")
    print("=" * 60)
    
    # Test Case 1: Profitable tournament player
    print("\n1. PROFITABLE TOURNAMENT PLAYER:")
    print("   Bankroll: $10,000, Buy-in: $100, Win Rate: 15%, ROI: 800%")
    print("   (15% win rate with 9x return = profitable)")
    bankroll = 10000
    buy_in = 100
    win_rate = 0.15
    roi = 8.0  # 800% ROI - realistic for tournaments
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    print(f"   Kelly Recommended Buy-in: ${bankroll * kelly:.2f}")
    
    # Test Case 2: Marginal player
    print("\n2. MARGINAL TOURNAMENT PLAYER:")
    print("   Bankroll: $5,000, Buy-in: $500, Win Rate: 12%, ROI: 600%")
    print("   (12% win rate with 7x return = barely profitable)")
    bankroll = 5000
    buy_in = 500
    win_rate = 0.12
    roi = 6.0  # 600% ROI
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    print(f"   Kelly Recommended Buy-in: ${bankroll * kelly:.2f}")
    
    # Test Case 3: Losing player (should have 100% RoR)
    print("\n3. LOSING TOURNAMENT PLAYER:")
    print("   Bankroll: $10,000, Buy-in: $100, Win Rate: 10%, ROI: 200%")
    print("   (10% win rate with 3x return = losing)")
    bankroll = 10000
    buy_in = 100
    win_rate = 0.10
    roi = 2.0  # 200% ROI - not enough to overcome low win rate
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    
    # Test Case 4: High-stakes profitable player
    print("\n4. HIGH-STAKES PROFITABLE PLAYER:")
    print("   Bankroll: $50,000, Buy-in: $1000, Win Rate: 10%, ROI: 1200%")
    print("   (10% win rate with 13x return = very profitable)")
    bankroll = 50000
    buy_in = 1000
    win_rate = 0.10
    roi = 12.0  # 1200% ROI
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    print(f"   Kelly Recommended Buy-in: ${bankroll * kelly:.2f}")
    
    # Test Case 5: Break-even scenario
    print("\n5. BREAK-EVEN SCENARIO:")
    print("   Bankroll: $10,000, Buy-in: $100, Win Rate: 14.3%, ROI: 600%")
    print("   (Edge should be close to 0)")
    bankroll = 10000
    buy_in = 100
    win_rate = 0.143  # Calculated to be close to break-even
    roi = 6.0
    
    ror = VarianceCalculator.risk_of_ruin_formula(bankroll, buy_in, win_rate, roi)
    kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
    
    print(f"   Risk of Ruin: {ror:.4f} ({ror*100:.2f}%)")
    print(f"   Kelly Fraction: {kelly:.4f} ({kelly*100:.2f}%)")
    
    print("\n" + "=" * 60)
    print("REALISTIC SCENARIOS TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_realistic_scenarios()