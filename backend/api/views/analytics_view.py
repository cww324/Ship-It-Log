import pandas as pd
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Q
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Tournament, Session, SessionTournament, Site


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_over_time(request):
    """
    Returns cumulative profit over time data for line chart
    """
    user = request.user
    
    # Get all tournaments for the user through sessions
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site').order_by('start_time')
    
    if not tournaments.exists():
        return Response({
            'labels': [],
            'datasets': [{
                'label': 'Cumulative Profit',
                'data': [],
                'borderColor': 'rgb(59, 130, 246)',
                'backgroundColor': 'rgba(59, 130, 246, 0.1)',
                'tension': 0.1
            }]
        })
    
    # Convert to pandas DataFrame for easier processing
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        data.append({
            'date': t.start_time.date(),
            'profit': profit,
            'buy_in': float(t.buy_in),
            'prize_won': float(t.prize_won),
            'bounties_won': float(t.bounties_won)
        })
    
    df = pd.DataFrame(data)
    
    # Group by date and calculate daily totals
    daily_profits = df.groupby('date')['profit'].sum().reset_index()
    daily_profits['cumulative_profit'] = daily_profits['profit'].cumsum()
    
    # Format for Chart.js
    labels = [date.strftime('%Y-%m-%d') for date in daily_profits['date']]
    cumulative_data = daily_profits['cumulative_profit'].tolist()
    daily_data = daily_profits['profit'].tolist()
    
    return Response({
        'labels': labels,
        'datasets': [
            {
                'label': 'Cumulative Profit',
                'data': cumulative_data,
                'borderColor': 'rgb(59, 130, 246)',
                'backgroundColor': 'rgba(59, 130, 246, 0.1)',
                'tension': 0.1,
                'fill': True
            },
            {
                'label': 'Daily Profit',
                'data': daily_data,
                'borderColor': 'rgb(16, 185, 129)',
                'backgroundColor': 'rgba(16, 185, 129, 0.1)',
                'tension': 0.1,
                'type': 'bar'
            }
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_performance(request):
    """
    Returns monthly performance breakdown for bar chart
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    if not tournaments.exists():
        return Response({
            'labels': [],
            'datasets': [{
                'label': 'Monthly Profit',
                'data': [],
                'backgroundColor': 'rgba(59, 130, 246, 0.8)'
            }]
        })
    
    # Convert to pandas DataFrame
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        data.append({
            'date': t.start_time,
            'profit': profit,
            'buy_in': float(t.buy_in),
            'tournament_count': 1
        })
    
    df = pd.DataFrame(data)
    df['month'] = df['date'].dt.to_period('M')
    
    # Group by month
    monthly_stats = df.groupby('month').agg({
        'profit': 'sum',
        'buy_in': 'sum',
        'tournament_count': 'sum'
    }).reset_index()
    
    monthly_stats['roi'] = (monthly_stats['profit'] / monthly_stats['buy_in'] * 100).round(2)
    
    labels = [str(month) for month in monthly_stats['month']]
    profit_data = monthly_stats['profit'].tolist()
    roi_data = monthly_stats['roi'].tolist()
    volume_data = monthly_stats['buy_in'].tolist()
    
    return Response({
        'labels': labels,
        'datasets': [
            {
                'label': 'Profit ($)',
                'data': profit_data,
                'backgroundColor': 'rgba(59, 130, 246, 0.8)',
                'yAxisID': 'y'
            },
            {
                'label': 'ROI (%)',
                'data': roi_data,
                'backgroundColor': 'rgba(16, 185, 129, 0.8)',
                'yAxisID': 'y1'
            }
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def win_loss_distribution(request):
    """
    Returns win/loss distribution for pie chart
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    )
    
    if not tournaments.exists():
        return Response({
            'labels': ['No Data'],
            'datasets': [{
                'data': [1],
                'backgroundColor': ['rgba(156, 163, 175, 0.8)']
            }]
        })
    
    # Convert to pandas for analysis
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        if profit > 0:
            category = 'Wins'
        elif profit < 0:
            category = 'Losses'
        else:
            category = 'Break-even'
        
        data.append({
            'category': category,
            'profit': profit,
            'count': 1
        })
    
    df = pd.DataFrame(data)
    distribution = df.groupby('category').agg({
        'count': 'sum',
        'profit': 'sum'
    }).reset_index()
    
    labels = distribution['category'].tolist()
    counts = distribution['count'].tolist()
    
    colors = {
        'Wins': 'rgba(16, 185, 129, 0.8)',
        'Losses': 'rgba(239, 68, 68, 0.8)',
        'Break-even': 'rgba(156, 163, 175, 0.8)'
    }
    
    background_colors = [colors.get(label, 'rgba(156, 163, 175, 0.8)') for label in labels]
    
    return Response({
        'labels': labels,
        'datasets': [{
            'data': counts,
            'backgroundColor': background_colors,
            'borderWidth': 2,
            'borderColor': '#ffffff'
        }]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def game_type_analysis(request):
    """
    Returns performance by game type
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    if not tournaments.exists():
        return Response({
            'labels': [],
            'datasets': [{
                'label': 'Profit by Game Type',
                'data': [],
                'backgroundColor': 'rgba(59, 130, 246, 0.8)'
            }]
        })
    
    # Convert to pandas
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        data.append({
            'game': t.game,
            'profit': profit,
            'buy_in': float(t.buy_in),
            'count': 1
        })
    
    df = pd.DataFrame(data)
    game_stats = df.groupby('game').agg({
        'profit': 'sum',
        'buy_in': 'sum',
        'count': 'sum'
    }).reset_index()
    
    game_stats['roi'] = (game_stats['profit'] / game_stats['buy_in'] * 100).round(2)
    game_stats['avg_profit'] = (game_stats['profit'] / game_stats['count']).round(2)
    
    labels = game_stats['game'].tolist()
    profit_data = game_stats['profit'].tolist()
    roi_data = game_stats['roi'].tolist()
    
    return Response({
        'labels': labels,
        'datasets': [
            {
                'label': 'Total Profit ($)',
                'data': profit_data,
                'backgroundColor': 'rgba(59, 130, 246, 0.8)',
                'yAxisID': 'y'
            },
            {
                'label': 'ROI (%)',
                'data': roi_data,
                'backgroundColor': 'rgba(16, 185, 129, 0.8)',
                'yAxisID': 'y1'
            }
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_length_vs_profit(request):
    """
    Returns session length vs profit scatter plot data
    """
    user = request.user
    
    sessions = Session.objects.filter(user=user).prefetch_related(
        'session_tournaments__tournament'
    )
    
    if not sessions.exists():
        return Response({
            'datasets': [{
                'label': 'Session Performance',
                'data': [],
                'backgroundColor': 'rgba(59, 130, 246, 0.6)'
            }]
        })
    
    # Convert to pandas
    data = []
    for session in sessions:
        if session.end_time:
            duration_hours = (session.end_time - session.start_time).total_seconds() / 3600
            
            # Calculate session profit
            total_profit = 0
            for st in session.session_tournaments.all():
                t = st.tournament
                profit = float(t.prize_won + t.bounties_won - t.buy_in)
                total_profit += profit
            
            data.append({
                'x': duration_hours,
                'y': total_profit,
                'session_id': session.id
            })
    
    if not data:
        return Response({
            'datasets': [{
                'label': 'Session Performance',
                'data': [],
                'backgroundColor': 'rgba(59, 130, 246, 0.6)'
            }]
        })
    
    return Response({
        'datasets': [{
            'label': 'Session Performance',
            'data': data,
            'backgroundColor': 'rgba(59, 130, 246, 0.6)',
            'borderColor': 'rgba(59, 130, 246, 1)',
            'pointRadius': 6,
            'pointHoverRadius': 8
        }]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
    """
    Returns summary statistics for analytics dashboard
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    sessions = Session.objects.filter(user=user)
    
    if not tournaments.exists():
        return Response({
            'total_tournaments': 0,
            'total_sessions': 0,
            'total_profit': 0,
            'total_volume': 0,
            'roi': 0,
            'win_rate': 0,
            'avg_session_profit': 0,
            'best_month': None,
            'most_profitable_game': None
        })
    
    # Convert to pandas for analysis
    tournament_data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        tournament_data.append({
            'profit': profit,
            'buy_in': float(t.buy_in),
            'game': t.game,
            'date': t.start_time,
            'win': profit > 0
        })
    
    df = pd.DataFrame(tournament_data)
    
    total_profit = df['profit'].sum()
    total_volume = df['buy_in'].sum()
    roi = (total_profit / total_volume * 100) if total_volume > 0 else 0
    win_rate = (df['win'].sum() / len(df) * 100) if len(df) > 0 else 0
    
    # Monthly analysis
    df['month'] = df['date'].dt.to_period('M')
    monthly_profit = df.groupby('month')['profit'].sum()
    best_month = str(monthly_profit.idxmax()) if not monthly_profit.empty else None
    
    # Game analysis
    game_profit = df.groupby('game')['profit'].sum()
    most_profitable_game = game_profit.idxmax() if not game_profit.empty else None
    
    # Session analysis
    session_data = []
    for session in sessions:
        session_profit = 0
        for st in session.session_tournaments.all():
            t = st.tournament
            profit = float(t.prize_won + t.bounties_won - t.buy_in)
            session_profit += profit
        session_data.append(session_profit)
    
    avg_session_profit = sum(session_data) / len(session_data) if session_data else 0
    
    return Response({
        'total_tournaments': len(df),
        'total_sessions': sessions.count(),
        'total_profit': round(total_profit, 2),
        'total_volume': round(total_volume, 2),
        'roi': round(roi, 2),
        'win_rate': round(win_rate, 2),
        'avg_session_profit': round(avg_session_profit, 2),
        'best_month': best_month,
        'most_profitable_game': most_profitable_game
    })