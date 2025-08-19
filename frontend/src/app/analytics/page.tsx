"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface AnalyticsSummary {
  total_tournaments: number;
  total_sessions: number;
  total_profit: number;
  total_volume: number;
  roi: number;
  win_rate: number;
  avg_session_profit: number;
  best_month: string | null;
  most_profitable_game: string | null;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [profitOverTimeData, setProfitOverTimeData] = useState<any>(null);
  const [monthlyPerformanceData, setMonthlyPerformanceData] = useState<any>(null);
  const [winLossData, setWinLossData] = useState<any>(null);
  const [gameTypeData, setGameTypeData] = useState<any>(null);
  const [sessionScatterData, setSessionScatterData] = useState<any>(null);

  // Auth guard
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  const loadAnalyticsData = useCallback(async () => {
    if (!ready) return;
    
    setLoading(true);
    try {
      const [
        summaryRes,
        profitRes,
        monthlyRes,
        winLossRes,
        gameTypeRes,
        sessionRes
      ] = await Promise.all([
        apiGet<AnalyticsSummary>('/analytics/summary/'),
        apiGet('/analytics/profit-over-time/'),
        apiGet('/analytics/monthly-performance/'),
        apiGet('/analytics/win-loss-distribution/'),
        apiGet('/analytics/game-type-analysis/'),
        apiGet('/analytics/session-length-vs-profit/')
      ]);

      setSummary(summaryRes);
      setProfitOverTimeData(profitRes);
      setMonthlyPerformanceData(monthlyRes);
      setWinLossData(winLossRes);
      setGameTypeData(gameTypeRes);
      setSessionScatterData(sessionRes);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [ready]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  if (!ready) return <div className="p-6">Loading...</div>;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Profit ($)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'ROI (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Duration: ${context.parsed.x.toFixed(1)}h, Profit: $${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Session Duration (hours)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Session Profit ($)'
        }
      }
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive performance analysis and insights</p>
        </div>
        <button
          onClick={loadAnalyticsData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className={`text-2xl font-bold ${summary.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${summary.total_profit.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{summary.roi.toFixed(1)}% ROI</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-blue-600">{summary.win_rate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">{summary.total_tournaments} tournaments</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className={`text-2xl font-bold ${summary.avg_session_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${summary.avg_session_profit.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">{summary.total_sessions} sessions</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Volume</p>
                <p className="text-2xl font-bold text-gray-900">${summary.total_volume.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total buy-ins</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profit Over Time */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Over Time</h3>
          <div className="h-64">
            {profitOverTimeData ? (
              <Line data={profitOverTimeData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h3>
          <div className="h-64">
            {monthlyPerformanceData ? (
              <Bar data={monthlyPerformanceData} options={monthlyChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Win/Loss Distribution */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Win/Loss Distribution</h3>
          <div className="h-64">
            {winLossData ? (
              <Pie data={winLossData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Game Type Analysis */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Game Type</h3>
          <div className="h-64">
            {gameTypeData ? (
              <Bar data={gameTypeData} options={monthlyChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Length vs Profit */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Length vs Profit</h3>
        <div className="h-80">
          {sessionScatterData ? (
            <Scatter data={sessionScatterData} options={scatterOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Insights Section */}
      {summary && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Best Performing Month</h4>
              <p className="text-gray-600">
                {summary.best_month ? summary.best_month : 'Not enough data yet'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Most Profitable Game</h4>
              <p className="text-gray-600">
                {summary.most_profitable_game ? summary.most_profitable_game : 'Not enough data yet'}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}