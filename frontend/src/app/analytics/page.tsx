"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import type { Site, FormatTag } from "@/types";
import type { FilterState } from "@/types/filters";
import { DEFAULT_FILTER_STATE, filtersToQueryParams } from "@/types/filters";
import PokerFilters from "@/components/PokerFilters";
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
  const [gameTypeData, setGameTypeData] = useState<any>(null);
  
  // New poker-specific charts
  const [stakesData, setStakesData] = useState<any>(null);
  const [varianceData, setVarianceData] = useState<any>(null);
  const [sitePerformanceData, setSitePerformanceData] = useState<any>(null);
  const [formatAnalysisData, setFormatAnalysisData] = useState<any>(null);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [sites, setSites] = useState<Site[]>([]);
  const [formatTags, setFormatTags] = useState<FormatTag[]>([]);

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
      // Convert filters to query parameters
      const filterParams = filtersToQueryParams(filters);
      const queryString = new URLSearchParams(filterParams).toString();
      const queryParam = queryString ? `?${queryString}` : '';
      
      const [
        summaryRes,
        profitRes,
        monthlyRes,
        gameTypeRes,
        stakesRes,
        varianceRes,
        siteRes,
        formatRes,
        sitesRes,
        tagsRes
      ] = await Promise.all([
        apiGet<AnalyticsSummary>(`/analytics/summary/${queryParam}`),
        apiGet(`/analytics/profit-over-time/${queryParam}`),
        apiGet(`/analytics/monthly-performance/${queryParam}`),
        apiGet(`/analytics/game-type-analysis/${queryParam}`),
        apiGet(`/analytics/performance-by-stakes/${queryParam}`),
        apiGet(`/analytics/variance-analysis/${queryParam}`),
        apiGet(`/analytics/site-performance/${queryParam}`),
        apiGet(`/analytics/tournament-format-analysis/${queryParam}`),
        apiGet<{results?: Site[]} | Site[]>('/sites/'),
        apiGet<{results?: FormatTag[]} | FormatTag[]>('/format-tags/')
      ]);

      setSummary(summaryRes);
      setProfitOverTimeData(profitRes);
      setMonthlyPerformanceData(monthlyRes);
      setGameTypeData(gameTypeRes);
      setStakesData(stakesRes);
      setVarianceData(varianceRes);
      setSitePerformanceData(siteRes);
      setFormatAnalysisData(formatRes);
      
      // Set sites and format tags for filters
      const sitesList: Site[] = Array.isArray(sitesRes) ? sitesRes : sitesRes?.results ?? [];
      setSites(sitesList);
      const tagsList: FormatTag[] = Array.isArray(tagsRes) ? tagsRes : tagsRes?.results ?? [];
      setFormatTags(tagsList);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [ready, filters]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

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
    <main className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <span>←</span>
              Back to Dashboard
            </button>
          </div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-300">Comprehensive performance analysis and insights</p>
        </div>
        <button
          onClick={loadAnalyticsData}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <PokerFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sites={sites}
        formatTags={formatTags}
        className="mb-8"
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Profit</p>
                <p className={`text-2xl font-bold ${summary.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${summary.total_profit.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">{summary.roi.toFixed(1)}% ROI</p>
              </div>
              <div className="w-12 h-12 bg-emerald-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Win Rate</p>
                <p className="text-2xl font-bold text-blue-400">{summary.win_rate.toFixed(1)}%</p>
                <p className="text-xs text-gray-400">{summary.total_tournaments} tournaments</p>
              </div>
              <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Avg Session</p>
                <p className={`text-2xl font-bold ${summary.avg_session_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${summary.avg_session_profit.toFixed(0)}
                </p>
                <p className="text-xs text-gray-400">{summary.total_sessions} sessions</p>
              </div>
              <div className="w-12 h-12 bg-purple-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Volume</p>
                <p className="text-2xl font-bold text-white">${summary.total_volume.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total buy-ins</p>
              </div>
              <div className="w-12 h-12 bg-orange-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profit Over Time */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Profit Over Time</h3>
          <div className="h-64">
            {profitOverTimeData ? (
              <Line data={profitOverTimeData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance</h3>
          <div className="h-64">
            {monthlyPerformanceData ? (
              <Bar data={monthlyPerformanceData} options={monthlyChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Performance by Stakes */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance by Stakes</h3>
          <div className="h-64">
            {stakesData ? (
              <Bar data={stakesData} options={monthlyChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Game Type Analysis */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance by Game Type</h3>
          <div className="h-64">
            {gameTypeData ? (
              <Bar data={gameTypeData} options={monthlyChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variance Analysis */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Variance & Downswing Analysis</h3>
        <div className="h-80">
          {varianceData ? (
            <Line data={varianceData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
        {varianceData?.summary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-red-600">${varianceData.summary.max_downswing.toLocaleString()}</div>
              <div className="text-gray-600">Max Downswing</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-orange-600">${varianceData.summary.current_downswing.toLocaleString()}</div>
              <div className="text-gray-600">Current Downswing</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">${varianceData.summary.peak_profit.toLocaleString()}</div>
              <div className="text-gray-600">Peak Profit</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">${varianceData.summary.current_profit.toLocaleString()}</div>
              <div className="text-gray-600">Current Profit</div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Site Performance */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Site Performance Comparison</h3>
          <div className="h-64">
            {sitePerformanceData ? (
              <Bar data={sitePerformanceData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Tournament Format Analysis */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Format Performance</h3>
          <div className="h-64">
            {formatAnalysisData?.speed_analysis ? (
              <Bar data={formatAnalysisData.speed_analysis} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <button
              className="text-sm text-blue-600 hover:text-blue-700"
              onClick={() => {
                // Toggle between speed and table size analysis
                // This could be enhanced with state management
              }}
            >
              Switch to Table Size Analysis
            </button>
          </div>
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