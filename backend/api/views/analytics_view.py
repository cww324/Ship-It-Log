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
from decimal import Decimal

from ..models import Tournament, Session, SessionTournament, Site


def apply_tournament_filters(queryset, request):
    """Apply filtering parameters to tournament queryset"""
    
    # Date filtering
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            queryset = queryset.filter(start_time__date__gte=date_from_obj)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(start_time__date__lte=date_to_obj)
        except ValueError:
            pass
    
    # Buy-in filtering (stakes)
    buy_in_min = request.query_params.get('buy_in_min')
    buy_in_max = request.query_params.get('buy_in_max')
    
    if buy_in_min:
        try:
            queryset = queryset.filter(buy_in__gte=Decimal(buy_in_min))
        except (ValueError, TypeError):
            pass
    
    if buy_in_max:
        try:
            queryset = queryset.filter(buy_in__lte=Decimal(buy_in_max))
        except (ValueError, TypeError):
            pass
    
    # Sites filtering
    sites = request.query_params.get('sites')
    if sites:
        try:
            site_ids = [int(s.strip()) for s in sites.split(',') if s.strip()]
            queryset = queryset.filter(site__id__in=site_ids)
        except ValueError:
            pass
    
    # Game types filtering
    game_types = request.query_params.get('game_types')
    if game_types:
        game_list = [g.strip() for g in game_types.split(',') if g.strip()]
        queryset = queryset.filter(game__in=game_list)
    
    # Tournament types filtering
    tournament_types = request.query_params.get('tournament_types')
    if tournament_types:
        type_list = [t.strip() for t in tournament_types.split(',') if t.strip()]
        queryset = queryset.filter(type__in=type_list)
    
    # Speed filtering
    speeds = request.query_params.get('speeds')
    if speeds:
        speed_list = [s.strip() for s in speeds.split(',') if s.strip()]
        queryset = queryset.filter(speed__in=speed_list)
    
    # Table size filtering
    table_sizes = request.query_params.get('table_sizes')
    if table_sizes:
        size_list = [s.strip() for s in table_sizes.split(',') if s.strip()]
        queryset = queryset.filter(table_size__in=size_list)
    
    # Format tags filtering
    format_tags = request.query_params.get('format_tags')
    if format_tags:
        try:
            tag_ids = [int(t.strip()) for t in format_tags.split(',') if t.strip()]
            queryset = queryset.filter(format_tags__id__in=tag_ids)
        except ValueError:
            pass
    
    # Results filtering
    results_filter = request.query_params.get('results_filter')
    if results_filter:
        if results_filter == 'winning':
            queryset = queryset.extra(
                where=["(prize_won + bounties_won - buy_in) > 0"]
            )
        elif results_filter == 'losing':
            queryset = queryset.extra(
                where=["(prize_won + bounties_won - buy_in) < 0"]
            )
        elif results_filter == 'breakeven':
            queryset = queryset.extra(
                where=["(prize_won + bounties_won - buy_in) = 0"]
            )
    
    return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_over_time(request):
    """
    Returns cumulative profit over time data for line chart
    """
    user = request.user
    
    # Get all tournaments for the user through sessions with filtering
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site').order_by('start_time')
    
    # Apply filters
    tournaments = apply_tournament_filters(tournaments, request)
    
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
    
    # Apply filters
    tournaments = apply_tournament_filters(tournaments, request)
    
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
    
    # Apply filters
    tournaments = apply_tournament_filters(tournaments, request)
    
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
    
    # Apply filters - THIS WAS MISSING!
    tournaments = apply_tournament_filters(tournaments, request)
    
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def performance_by_stakes(request):
    """
    Returns performance breakdown by stakes levels
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    # Apply filters
    tournaments = apply_tournament_filters(tournaments, request)
    
    if not tournaments.exists():
        return Response({
            'labels': [],
            'datasets': [{
                'label': 'Profit by Stakes',
                'data': [],
                'backgroundColor': 'rgba(59, 130, 246, 0.8)'
            }]
        })
    
    # Convert to pandas and categorize by stakes
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        buy_in = float(t.buy_in)
        
        # Categorize stakes
        if buy_in <= 55:
            stakes_category = 'Small ($0-55)'
        elif buy_in <= 215:
            stakes_category = 'Medium ($55-215)'
        else:
            stakes_category = 'High ($215+)'
        
        data.append({
            'stakes': stakes_category,
            'profit': profit,
            'buy_in': buy_in,
            'count': 1
        })
    
    df = pd.DataFrame(data)
    stakes_stats = df.groupby('stakes').agg({
        'profit': 'sum',
        'buy_in': 'sum',
        'count': 'sum'
    }).reset_index()
    
    stakes_stats['roi'] = (stakes_stats['profit'] / stakes_stats['buy_in'] * 100).round(2)
    stakes_stats['avg_profit'] = (stakes_stats['profit'] / stakes_stats['count']).round(2)
    
    labels = stakes_stats['stakes'].tolist()
    profit_data = stakes_stats['profit'].tolist()
    roi_data = stakes_stats['roi'].tolist()
    volume_data = stakes_stats['buy_in'].tolist()
    count_data = stakes_stats['count'].tolist()
    
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
        ],
        'summary': {
            'volume_by_stakes': dict(zip(labels, volume_data)),
            'count_by_stakes': dict(zip(labels, count_data))
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def variance_analysis(request):
    """
    Returns variance and downswing analysis
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site').order_by('start_time')
    
    # Apply filters
    tournaments = apply_tournament_filters(tournaments, request)
    
    if not tournaments.exists():
        return Response({
            'labels': [],
            'datasets': [{
                'label': 'Running Variance',
                'data': [],
                'borderColor': 'rgb(239, 68, 68)',
                'backgroundColor': 'rgba(239, 68, 68, 0.1)'
            }]
        })
    
    # Calculate running variance and identify downswings
    data = []
    cumulative_profit = 0
    peak_profit = 0
    current_downswing = 0
    max_downswing = 0
    
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        cumulative_profit += profit
        
        # Track peak and downswings
        if cumulative_profit > peak_profit:
            peak_profit = cumulative_profit
            current_downswing = 0
        else:
            current_downswing = peak_profit - cumulative_profit
            if current_downswing > max_downswing:
                max_downswing = current_downswing
        
        data.append({
            'date': t.start_time.date(),
            'cumulative_profit': cumulative_profit,
            'peak_profit': peak_profit,
            'current_downswing': current_downswing,
            'profit': profit
        })
    
    df = pd.DataFrame(data)
    
    # Group by date for daily aggregation
    daily_data = df.groupby('date').agg({
        'cumulative_profit': 'last',
        'peak_profit': 'last',
        'current_downswing': 'last',
        'profit': 'sum'
    }).reset_index()
    
    # Calculate rolling variance (30-day window)
    daily_data['rolling_variance'] = daily_data['profit'].rolling(window=min(30, len(daily_data)), min_periods=1).var()
    
    labels = [date.strftime('%Y-%m-%d') for date in daily_data['date']]
    cumulative_data = daily_data['cumulative_profit'].tolist()
    peak_data = daily_data['peak_profit'].tolist()
    downswing_data = daily_data['current_downswing'].tolist()
    variance_data = daily_data['rolling_variance'].fillna(0).tolist()
    
    return Response({
        'labels': labels,
        'datasets': [
            {
                'label': 'Cumulative Profit',
                'data': cumulative_data,
                'borderColor': 'rgb(59, 130, 246)',
                'backgroundColor': 'rgba(59, 130, 246, 0.1)',
                'tension': 0.1,
                'fill': False
            },
            {
                'label': 'Peak Profit',
                'data': peak_data,
                'borderColor': 'rgb(16, 185, 129)',
                'backgroundColor': 'rgba(16, 185, 129, 0.1)',
                'tension': 0.1,
                'fill': False,
                'borderDash': [5, 5]
            },
            {
                'label': 'Current Downswing',
                'data': downswing_data,
                'borderColor': 'rgb(239, 68, 68)',
                'backgroundColor': 'rgba(239, 68, 68, 0.1)',
                'tension': 0.1,
                'fill': True
            }
        ],
        'summary': {
            'max_downswing': round(max_downswing, 2),
            'current_downswing': round(current_downswing, 2),
            'peak_profit': round(peak_profit, 2),
            'current_profit': round(cumulative_profit, 2)
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def site_performance_comparison(request):
    """
    Returns performance comparison across different sites
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    # Apply filters
    tournaments = apply_tournament_filters(tournaments, request)
    
    if not tournaments.exists():
        return Response({
            'labels': [],
            'datasets': [{
                'label': 'Profit by Site',
                'data': [],
                'backgroundColor': 'rgba(59, 130, 246, 0.8)'
            }]
        })
    
    # Convert to pandas and analyze by site
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        data.append({
            'site': t.site.name,
            'site_type': t.site.type,
            'profit': profit,
            'buy_in': float(t.buy_in),
            'count': 1
        })
    
    df = pd.DataFrame(data)
    site_stats = df.groupby(['site', 'site_type']).agg({
        'profit': 'sum',
        'buy_in': 'sum',
        'count': 'sum'
    }).reset_index()
    
    site_stats['roi'] = (site_stats['profit'] / site_stats['buy_in'] * 100).round(2)
    site_stats['avg_profit'] = (site_stats['profit'] / site_stats['count']).round(2)
    
    # Sort by profit for better visualization
    site_stats = site_stats.sort_values('profit', ascending=False)
    
    labels = site_stats['site'].tolist()
    profit_data = site_stats['profit'].tolist()
    roi_data = site_stats['roi'].tolist()
    volume_data = site_stats['buy_in'].tolist()
    count_data = site_stats['count'].tolist()
    
    # Color code by site type
    colors = []
    for site_type in site_stats['site_type']:
        if site_type == 'live':
            colors.append('rgba(239, 68, 68, 0.8)')  # Red for live
        else:
            colors.append('rgba(59, 130, 246, 0.8)')  # Blue for online
    
    return Response({
        'labels': labels,
        'datasets': [
            {
                'label': 'Total Profit ($)',
                'data': profit_data,
                'backgroundColor': colors,
                'yAxisID': 'y'
            }
        ],
        'summary': {
            'roi_by_site': dict(zip(labels, roi_data)),
            'volume_by_site': dict(zip(labels, volume_data)),
            'count_by_site': dict(zip(labels, count_data)),
            'site_types': dict(zip(labels, site_stats['site_type'].tolist()))
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_format_analysis(request):
    """
    Returns performance analysis by tournament format (speed, table size)
    """
    user = request.user
    
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    # Apply filters
    tournaments = apply_tournament_filters(tournaments, request)
    
    if not tournaments.exists():
        return Response({
            'speed_analysis': {'labels': [], 'datasets': []},
            'table_size_analysis': {'labels': [], 'datasets': []}
        })
    
    # Convert to pandas
    data = []
    for t in tournaments:
        profit = float(t.prize_won + t.bounties_won - t.buy_in)
        data.append({
            'speed': t.speed,
            'table_size': t.table_size,
            'profit': profit,
            'buy_in': float(t.buy_in),
            'count': 1
        })
    
    df = pd.DataFrame(data)
    
    # Speed analysis
    speed_stats = df.groupby('speed').agg({
        'profit': 'sum',
        'buy_in': 'sum',
        'count': 'sum'
    }).reset_index()
    speed_stats['roi'] = (speed_stats['profit'] / speed_stats['buy_in'] * 100).round(2)
    
    # Table size analysis
    table_stats = df.groupby('table_size').agg({
        'profit': 'sum',
        'buy_in': 'sum',
        'count': 'sum'
    }).reset_index()
    table_stats['roi'] = (table_stats['profit'] / table_stats['buy_in'] * 100).round(2)
    
    return Response({
        'speed_analysis': {
            'labels': speed_stats['speed'].tolist(),
            'datasets': [
                {
                    'label': 'Profit by Speed',
                    'data': speed_stats['profit'].tolist(),
                    'backgroundColor': ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)',
                                     'rgba(239, 68, 68, 0.8)', 'rgba(245, 158, 11, 0.8)']
                }
            ],
            'roi_data': speed_stats['roi'].tolist()
        },
        'table_size_analysis': {
            'labels': table_stats['table_size'].tolist(),
            'datasets': [
                {
                    'label': 'Profit by Table Size',
                    'data': table_stats['profit'].tolist(),
                    'backgroundColor': ['rgba(139, 69, 19, 0.8)', 'rgba(75, 85, 99, 0.8)',
                                     'rgba(168, 85, 247, 0.8)', 'rgba(236, 72, 153, 0.8)']
                }
            ],
            'roi_data': table_stats['roi'].tolist()
        }
    })