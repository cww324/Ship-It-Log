"""
Tournament Variance Calculator Utilities

This module provides comprehensive variance calculation algorithms for poker tournament
bankroll management, including Kelly Criterion, Risk of Ruin, and Monte Carlo simulations.
"""

import math
import random
import numpy as np
from typing import Dict, List, Tuple, Optional
from decimal import Decimal


class VarianceCalculator:
    """
    Comprehensive variance calculator for tournament poker bankroll management
    """
    
    @staticmethod
    def kelly_criterion(win_rate: float, average_roi: float) -> float:
        """
        Calculate optimal bet sizing using Kelly Criterion
        
        Args:
            win_rate: Probability of winning (0.0 to 1.0)
            average_roi: Average return on investment when winning (0.0+)
            
        Returns:
            Optimal fraction of bankroll to risk (0.0 to 1.0)
        """
        if win_rate <= 0 or average_roi <= 0:
            return 0.0
        
        # FIXED: Kelly formula for tournaments
        # Kelly formula: f = (edge) / (variance/expected_value^2)
        # Simplified for tournaments: f = edge / variance_coefficient
        # For tournaments: f = (p*b - q) / b where b = net odds received
        
        # Net odds when winning (what you get back per dollar bet, minus the dollar bet)
        b = average_roi  # This is the net gain ratio when winning
        p = win_rate
        q = 1 - win_rate
        
        # Kelly fraction = (probability * odds - (1-probability)) / odds
        kelly_fraction = (p * b - q) / b if b > 0 else 0.0
        return max(0.0, min(1.0, kelly_fraction))  # Clamp between 0 and 1
    
    @staticmethod
    def risk_of_ruin_formula(bankroll: float, buy_in: float, win_rate: float, average_roi: float) -> float:
        """
        Calculate risk of ruin using standard poker formula
        
        Args:
            bankroll: Current bankroll amount
            buy_in: Tournament buy-in amount
            win_rate: Probability of winning (0.0 to 1.0)
            average_roi: Average ROI when winning (as decimal, e.g., 0.5 for 50% ROI)
            
        Returns:
            Risk of ruin probability (0.0 to 1.0)
        """
        if bankroll <= 0 or buy_in <= 0 or win_rate <= 0:
            return 1.0
        
        # FIXED: Correct edge calculation for tournaments
        # Edge = Expected Value per tournament / Buy-in
        # For tournaments: EV = win_rate * (total_return) + (1-win_rate) * (-buy_in)
        # Where total_return = buy_in * (1 + roi)
        # EV = win_rate * buy_in * (1 + roi) - (1-win_rate) * buy_in
        # EV = buy_in * [win_rate * (1 + roi) - (1-win_rate)]
        # EV = buy_in * [win_rate * (2 + roi) - 1]
        # Edge = EV / buy_in = win_rate * (2 + roi) - 1
        edge = win_rate * (2 + average_roi) - 1
        
        if edge <= 0:
            return 1.0  # 100% risk if no edge
        
        # Number of buy-ins in bankroll
        buy_ins = bankroll / buy_in
        
        # Risk of ruin formula: ((1-edge)/(1+edge))^buy_ins
        try:
            ratio = (1 - edge) / (1 + edge)
            
            # Handle edge cases that can cause invalid calculations
            if ratio <= 0 or ratio != ratio:  # ratio != ratio checks for NaN
                return 1.0 if edge <= 0 else 0.0
            
            if ratio >= 1:
                return 1.0  # Risk approaches 100% if ratio >= 1
            
            # Safe power calculation
            if buy_ins > 1000:  # Prevent extremely large exponents
                buy_ins = 1000
                
            ror = ratio ** buy_ins
            
            # Handle potential NaN or infinite results
            if ror != ror or ror == float('inf') or ror == float('-inf'):
                return 1.0 if edge <= 0 else 0.0
                
            return min(1.0, max(0.0, ror))
        except (OverflowError, ZeroDivisionError, ValueError):
            return 1.0 if edge <= 0 else 0.0
    
    @staticmethod
    def tournament_variance(buy_in: float, win_rate: float, average_roi: float) -> Dict[str, float]:
        """
        Calculate tournament variance metrics
        
        Returns:
            Dictionary with variance, standard deviation, and expected value
        """
        # FIXED: Expected value per tournament
        # EV = win_rate * (prize_when_winning) + (1-win_rate) * (loss_when_losing)
        # EV = win_rate * (buy_in * (1 + roi)) + (1-win_rate) * (-buy_in)
        # EV = buy_in * [win_rate * (1 + roi) - (1-win_rate)]
        # EV = buy_in * [win_rate * (1 + roi) - 1 + win_rate]
        # EV = buy_in * [win_rate * (2 + roi) - 1]
        ev = buy_in * (win_rate * (2 + average_roi) - 1)
        
        # Calculate variance
        win_amount = buy_in * (1 + average_roi)
        lose_amount = buy_in
        
        variance = (win_rate * (win_amount - ev)**2 + 
                   (1 - win_rate) * (-lose_amount - ev)**2)
        
        return {
            'expected_value': ev,
            'variance': variance,
            'standard_deviation': math.sqrt(variance),
            'coefficient_of_variation': math.sqrt(variance) / abs(ev) if ev != 0 else float('inf')
        }
    
    @staticmethod
    def monte_carlo_simulation(initial_bankroll: float, buy_in: float, win_rate: float, 
                             average_roi: float, num_tournaments: int = 1000, 
                             num_simulations: int = 10000) -> Dict:
        """
        Run Monte Carlo simulation for bankroll projections
        
        Returns:
            Comprehensive simulation results with percentiles and risk metrics
        """
        results = []
        
        for _ in range(num_simulations):
            bankroll = initial_bankroll
            bankroll_history = [bankroll]
            tournaments_played = 0
            
            for tournament in range(num_tournaments):
                if bankroll < buy_in:
                    break  # Bankrupt
                
                bankroll -= buy_in
                tournaments_played += 1
                
                # Simulate tournament result
                if random.random() < win_rate:
                    # Win: get back buy-in plus ROI
                    bankroll += buy_in * (1 + average_roi)
                # Lose: already subtracted buy-in
                
                bankroll_history.append(bankroll)
            
            results.append({
                'final_bankroll': bankroll,
                'bankroll_history': bankroll_history,
                'tournaments_played': tournaments_played,
                'went_broke': bankroll < buy_in,
                'peak_bankroll': max(bankroll_history),
                'lowest_bankroll': min(bankroll_history)
            })
        
        return VarianceCalculator._analyze_monte_carlo_results(results)
    
    @staticmethod
    def _analyze_monte_carlo_results(results: List[Dict]) -> Dict:
        """
        Analyze Monte Carlo simulation results
        """
        final_bankrolls = [r['final_bankroll'] for r in results]
        broke_count = sum(1 for r in results if r['went_broke'])
        peak_bankrolls = [r['peak_bankroll'] for r in results]
        lowest_bankrolls = [r['lowest_bankroll'] for r in results]
        
        return {
            'risk_of_ruin': broke_count / len(results),
            'median_final_bankroll': np.median(final_bankrolls),
            'percentiles': {
                'p5': np.percentile(final_bankrolls, 5),
                'p25': np.percentile(final_bankrolls, 25),
                'p50': np.percentile(final_bankrolls, 50),
                'p75': np.percentile(final_bankrolls, 75),
                'p95': np.percentile(final_bankrolls, 95)
            },
            'average_final_bankroll': np.mean(final_bankrolls),
            'peak_bankroll_stats': {
                'median': np.median(peak_bankrolls),
                'p95': np.percentile(peak_bankrolls, 95)
            },
            'lowest_bankroll_stats': {
                'median': np.median(lowest_bankrolls),
                'p5': np.percentile(lowest_bankrolls, 5)
            },
            'average_tournaments_played': np.mean([r['tournaments_played'] for r in results])
        }
    
    @staticmethod
    def confidence_intervals(monte_carlo_results: List[Dict], max_tournaments: int = 1000) -> Dict:
        """
        Calculate confidence intervals from Monte Carlo results
        """
        intervals = {}
        confidence_levels = [5, 25, 50, 75, 95]
        
        for tournament_num in range(0, max_tournaments, 50):  # Every 50 tournaments
            bankrolls_at_tournament = []
            
            for result in monte_carlo_results:
                if tournament_num < len(result['bankroll_history']):
                    bankrolls_at_tournament.append(result['bankroll_history'][tournament_num])
            
            if bankrolls_at_tournament:
                intervals[f'tournament_{tournament_num}'] = {
                    f'p{level}': np.percentile(bankrolls_at_tournament, level)
                    for level in confidence_levels
                }
        
        return intervals
    
    @staticmethod
    def calculate_bankroll_requirements(buy_in: float, win_rate: float, average_roi: float, 
                                      target_ror: float = 0.01) -> float:
        """
        Calculate required bankroll for target risk of ruin
        
        Args:
            buy_in: Tournament buy-in amount
            win_rate: Probability of winning
            average_roi: Average ROI when winning
            target_ror: Target risk of ruin (default 1%)
            
        Returns:
            Required bankroll amount
        """
        if win_rate <= 0 or average_roi <= 0:
            return float('inf')
        
        # FIXED: Use correct edge calculation
        edge = win_rate * (2 + average_roi) - 1
        
        if edge <= 0:
            return float('inf')
        
        # Solve for bankroll: target_ror = ((1-edge)/(1+edge))^(bankroll/buy_in)
        # bankroll = buy_in * log(target_ror) / log((1-edge)/(1+edge))
        
        try:
            ratio = (1 - edge) / (1 + edge)
            if ratio <= 0:
                return 0
            
            buy_ins_needed = math.log(target_ror) / math.log(ratio)
            return buy_ins_needed * buy_in
        except (ValueError, ZeroDivisionError):
            return float('inf')
    
    @staticmethod
    def multi_stakes_analysis(bankroll: float, stakes_levels: List[float], 
                            win_rates: List[float], rois: List[float]) -> Dict:
        """
        Analyze risk across different stakes levels
        
        Args:
            bankroll: Current bankroll
            stakes_levels: List of buy-in amounts to analyze
            win_rates: List of win rates for each stake level
            rois: List of ROIs for each stake level
            
        Returns:
            Analysis for each stake level
        """
        analysis = {}
        
        for i, stake in enumerate(stakes_levels):
            win_rate = win_rates[i] if i < len(win_rates) else win_rates[-1]
            roi = rois[i] if i < len(rois) else rois[-1]
            
            ror = VarianceCalculator.risk_of_ruin_formula(bankroll, stake, win_rate, roi)
            kelly = VarianceCalculator.kelly_criterion(win_rate, roi)
            recommended_br = VarianceCalculator.calculate_bankroll_requirements(stake, win_rate, roi)
            
            # Risk level classification
            if ror < 0.01:
                risk_level = 'very_low'
            elif ror < 0.05:
                risk_level = 'low'
            elif ror < 0.10:
                risk_level = 'moderate'
            elif ror < 0.20:
                risk_level = 'high'
            else:
                risk_level = 'very_high'
            
            analysis[f'${int(stake)}'] = {
                'buy_in': stake,
                'risk_of_ruin': ror,
                'risk_level': risk_level,
                'kelly_fraction': kelly,
                'recommended_bankroll': recommended_br,
                'buy_ins_available': bankroll / stake,
                'kelly_recommended_buy_in': bankroll * kelly if kelly > 0 else 0
            }
        
        return analysis
    
    @staticmethod
    def get_risk_level_color(ror: float) -> str:
        """
        Get color code for risk level visualization
        """
        if ror < 0.01:
            return '#10b981'  # emerald-500
        elif ror < 0.05:
            return '#f59e0b'  # amber-500
        elif ror < 0.10:
            return '#f97316'  # orange-500
        else:
            return '#ef4444'  # red-500
    
    @staticmethod
    def get_risk_level_text(ror: float) -> str:
        """
        Get human-readable risk level text
        """
        if ror < 0.01:
            return 'Very Low Risk'
        elif ror < 0.05:
            return 'Low Risk'
        elif ror < 0.10:
            return 'Moderate Risk'
        elif ror < 0.20:
            return 'High Risk'
        else:
            return 'Very High Risk'