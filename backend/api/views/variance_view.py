"""
Variance Calculator API Views

This module provides API endpoints for tournament variance calculations,
integrating with existing tournament data and analytics infrastructure.
"""

import pandas as pd
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import JsonResponse
from decimal import Decimal

from ..models import Tournament, Session
from ..utils.variance_calculator import VarianceCalculator
from .analytics_view import apply_tournament_filters


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def variance_calculator(request):
    """
    Calculate comprehensive variance metrics for tournament poker bankroll management
    
    Request body:
    {
        "bankroll": 10000,
        "target_buy_in": 100,
        "custom_win_rate": null,  // Optional override
        "custom_roi": null,       // Optional override
        "simulation_tournaments": 1000,
        "simulation_runs": 10000,
        "stakes_analysis": [50, 100, 200, 500]
    }
    
    Returns comprehensive variance analysis including Kelly Criterion,
    Risk of Ruin, Monte Carlo simulations, and multi-stakes analysis.
    """
    user = request.user
    
    # Parse request data
    data = request.data
    bankroll = float(data.get('bankroll', 10000))
    target_buy_in = float(data.get('target_buy_in', 100))
    custom_win_rate = data.get('custom_win_rate')
    custom_roi = data.get('custom_roi')
    simulation_tournaments = int(data.get('simulation_tournaments', 1000))
    simulation_runs = int(data.get('simulation_runs', 5000))  # Reduced for performance
    stakes_analysis = data.get('stakes_analysis', [25, 50, 100, 200, 500])
    
    # Convert custom values to float if provided
    if custom_win_rate is not None:
        custom_win_rate = float(custom_win_rate)
    if custom_roi is not None:
        custom_roi = float(custom_roi)
    
    try:
        # Get user's tournament data with filters
        tournaments = Tournament.objects.filter(
            tournament_sessions__session__user=user
        ).select_related('site').order_by('start_time')
        
        # Apply existing filter system (reuse from analytics)
        tournaments = apply_tournament_filters(tournaments, request)
        
        if not tournaments.exists():
            return Response({
                'error': 'No tournament data found for analysis',
                'player_stats': {
                    'total_tournaments': 0,
                    'win_rate': 0,
                    'average_roi': 0,
                    'total_profit': 0,
                    'total_volume': 0
                }
            }, status=400)
        
        # Calculate player statistics from historical data
        player_stats = _calculate_player_stats(tournaments)
        
        # Use custom values if provided, otherwise use calculated stats
        win_rate = custom_win_rate if custom_win_rate is not None else player_stats['win_rate']
        average_roi = custom_roi if custom_roi is not None else player_stats['average_roi']
        
        # Validate inputs
        if win_rate <= 0 or average_roi <= 0:
            return Response({
                'error': 'Invalid win rate or ROI. Please check your tournament data or provide custom values.',
                'player_stats': player_stats
            }, status=400)
        
        # Calculate Kelly Criterion
        kelly_fraction = VarianceCalculator.kelly_criterion(win_rate, average_roi)
        kelly_recommended_buy_in = bankroll * kelly_fraction
        
        # Calculate Risk of Ruin for target buy-in
        target_ror = VarianceCalculator.risk_of_ruin_formula(bankroll, target_buy_in, win_rate, average_roi)
        
        # Calculate tournament variance metrics
        variance_metrics = VarianceCalculator.tournament_variance(target_buy_in, win_rate, average_roi)
        
        # Run Monte Carlo simulation
        monte_carlo_results = VarianceCalculator.monte_carlo_simulation(
            bankroll, target_buy_in, win_rate, average_roi, 
            simulation_tournaments, simulation_runs
        )
        
        # Multi-stakes analysis
        stakes_win_rates = [win_rate] * len(stakes_analysis)  # Assume same win rate across stakes
        stakes_rois = [average_roi] * len(stakes_analysis)    # Assume same ROI across stakes
        multi_stakes = VarianceCalculator.multi_stakes_analysis(
            bankroll, stakes_analysis, stakes_win_rates, stakes_rois
        )
        
        # Calculate bankroll recommendations
        bankroll_recommendations = {
            'conservative': {
                'ror_1_percent': VarianceCalculator.calculate_bankroll_requirements(
                    target_buy_in, win_rate, average_roi, 0.01
                ),
                'ror_5_percent': VarianceCalculator.calculate_bankroll_requirements(
                    target_buy_in, win_rate, average_roi, 0.05
                )
            },
            'aggressive': {
                'ror_10_percent': VarianceCalculator.calculate_bankroll_requirements(
                    target_buy_in, win_rate, average_roi, 0.10
                ),
                'ror_20_percent': VarianceCalculator.calculate_bankroll_requirements(
                    target_buy_in, win_rate, average_roi, 0.20
                )
            }
        }
        
        # Prepare chart data for Risk of Ruin vs Buy-in
        ror_chart_data = _prepare_ror_chart_data(bankroll, win_rate, average_roi, stakes_analysis)
        
        # Build comprehensive response
        response_data = {
            'player_stats': player_stats,
            'kelly_criterion': {
                'optimal_fraction': round(kelly_fraction, 4),
                'recommended_buy_in': round(kelly_recommended_buy_in, 2),
                'current_buy_in': target_buy_in,
                'status': _get_kelly_status(target_buy_in, kelly_recommended_buy_in),
                'explanation': _get_kelly_explanation(kelly_fraction, target_buy_in, kelly_recommended_buy_in)
            },
            'risk_of_ruin': {
                'current_stake': {
                    'buy_in': target_buy_in,
                    'ror_percentage': round(target_ror * 100, 2),
                    'risk_level': VarianceCalculator.get_risk_level_text(target_ror),
                    'risk_color': VarianceCalculator.get_risk_level_color(target_ror)
                },
                'stakes_analysis': multi_stakes,
                'chart_data': ror_chart_data
            },
            'monte_carlo': monte_carlo_results,
            'bankroll_recommendations': bankroll_recommendations,
            'variance_metrics': {
                'expected_value_per_tournament': round(variance_metrics['expected_value'], 2),
                'standard_deviation': round(variance_metrics['standard_deviation'], 2),
                'coefficient_of_variation': round(variance_metrics['coefficient_of_variation'], 2) if variance_metrics['coefficient_of_variation'] != float('inf') else 'N/A'
            },
            'calculation_parameters': {
                'bankroll': bankroll,
                'target_buy_in': target_buy_in,
                'win_rate': round(win_rate, 4),
                'average_roi': round(average_roi, 4),
                'simulation_tournaments': simulation_tournaments,
                'simulation_runs': simulation_runs,
                'used_custom_stats': custom_win_rate is not None or custom_roi is not None
            }
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response({
            'error': f'Calculation failed: {str(e)}',
            'player_stats': _calculate_player_stats(tournaments) if 'tournaments' in locals() else {}
        }, status=500)


def _calculate_player_stats(tournaments):
    """
    Calculate player statistics from tournament data
    """
    if not tournaments.exists():
        return {
            'total_tournaments': 0,
            'win_rate': 0,
            'average_roi': 0,
            'total_profit': 0,
            'total_volume': 0,
            'variance': 0
        }
    
    # Convert to pandas for analysis
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        data.append({
            'profit': profit,
            'buy_in': float(t.buy_in),
            'win': profit > 0,
            'prize_won': float(t.prize_won),
            'bounties_won': float(t.bounties_won)
        })
    
    df = pd.DataFrame(data)
    
    total_tournaments = len(df)
    total_profit = df['profit'].sum()
    total_volume = df['buy_in'].sum()
    win_count = df['win'].sum()
    
    win_rate = win_count / total_tournaments if total_tournaments > 0 else 0
    
    # Calculate ROI only for winning tournaments
    winning_tournaments = df[df['win']]
    if len(winning_tournaments) > 0:
        # ROI calculation for tournaments: (total_return - buy_in) / buy_in = profit / buy_in
        winning_tournaments_copy = winning_tournaments.copy()
        winning_tournaments_copy['roi_per_tournament'] = winning_tournaments_copy['profit'] / winning_tournaments_copy['buy_in']
        average_roi = winning_tournaments_copy['roi_per_tournament'].mean()
    else:
        average_roi = 0
    
    # Calculate variance
    variance = df['profit'].var() if len(df) > 1 else 0
    
    return {
        'total_tournaments': total_tournaments,
        'win_rate': win_rate,
        'average_roi': average_roi,
        'total_profit': round(total_profit, 2),
        'total_volume': round(total_volume, 2),
        'variance': round(variance, 2)
    }


def _prepare_ror_chart_data(bankroll, win_rate, average_roi, stakes_levels):
    """
    Prepare chart data for Risk of Ruin vs Buy-in visualization
    """
    labels = []
    ror_data = []
    colors = []
    
    for stake in stakes_levels:
        ror = VarianceCalculator.risk_of_ruin_formula(bankroll, stake, win_rate, average_roi)
        
        labels.append(f'${int(stake)}')
        ror_data.append(round(ror * 100, 2))  # Convert to percentage
        colors.append(VarianceCalculator.get_risk_level_color(ror))
    
    return {
        'labels': labels,
        'datasets': [{
            'label': 'Risk of Ruin (%)',
            'data': ror_data,
            'backgroundColor': colors,
            'borderColor': colors,
            'borderWidth': 2
        }]
    }


def _get_kelly_status(current_buy_in, kelly_recommended):
    """
    Determine Kelly Criterion status relative to current play
    """
    if kelly_recommended == 0:
        return 'no_edge'
    
    ratio = current_buy_in / kelly_recommended
    
    if ratio < 0.5:
        return 'very_conservative'
    elif ratio < 0.8:
        return 'conservative'
    elif ratio < 1.2:
        return 'optimal'
    elif ratio < 2.0:
        return 'aggressive'
    else:
        return 'very_aggressive'


def _get_kelly_explanation(kelly_fraction, current_buy_in, kelly_recommended):
    """
    Generate human-readable explanation of Kelly Criterion recommendation
    """
    if kelly_fraction == 0:
        return "No positive edge detected. Consider improving your game or moving to softer games."
    
    percentage = kelly_fraction * 100
    
    if current_buy_in < kelly_recommended * 0.8:
        return f"Kelly suggests risking {percentage:.1f}% of bankroll (${kelly_recommended:.0f}). You're playing conservatively at ${current_buy_in}."
    elif current_buy_in > kelly_recommended * 1.2:
        return f"Kelly suggests risking {percentage:.1f}% of bankroll (${kelly_recommended:.0f}). You're playing aggressively at ${current_buy_in}."
    else:
        return f"Kelly suggests risking {percentage:.1f}% of bankroll (${kelly_recommended:.0f}). Your current play is near optimal."