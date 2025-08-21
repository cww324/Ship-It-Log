"use client";

import { useState, useEffect, useCallback } from "react";
import { calculateVariance } from "@/lib/api";
import type { VarianceCalculatorRequest, VarianceCalculatorResponse } from "@/lib/api";
import type { FilterState } from "@/types/filters";
import { filtersToQueryParams } from "@/types/filters";
import { Bar, Line } from 'react-chartjs-2';

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

interface VarianceCalculatorProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  summary: AnalyticsSummary | null;
}

interface VarianceState {
  bankroll: number;
  useAutoBankroll: boolean;
  autoBankrollAmount: number;
  targetBuyIn: number;
  customWinRate: number | null;
  customROI: number | null;
  loading: boolean;
  results: VarianceCalculatorResponse | null;
  error: string | null;
}

// Debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

const VarianceCalculator: React.FC<VarianceCalculatorProps> = ({
  filters, onFiltersChange, summary
}) => {
  const [state, setState] = useState<VarianceState>({
    bankroll: 10000,
    useAutoBankroll: true,
    autoBankrollAmount: 0,
    targetBuyIn: 100,
    customWinRate: null,
    customROI: null,
    loading: false,
    results: null,
    error: null
  });

  // Auto-calculate bankroll from profit history and populate stats
  useEffect(() => {
    if (summary) {
      // Estimate bankroll: assume starting bankroll was 10x current volume, add total profit
      const estimatedStarting = Math.max(summary.total_volume * 0.1, 5000);
      const estimatedCurrent = estimatedStarting + summary.total_profit;
      
      setState(prev => ({
        ...prev,
        autoBankrollAmount: Math.max(estimatedCurrent, 1000),
        // Auto-populate win rate from summary if user hasn't set custom values
        // Don't auto-populate ROI - let backend calculate proper per-winning-tournament ROI
        customWinRate: prev.customWinRate !== null ? prev.customWinRate : (summary.win_rate / 100),
        customROI: prev.customROI // Keep user's custom ROI or null to use backend calculation
      }));
    }
  }, [summary]);

  const calculateVarianceData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const request: VarianceCalculatorRequest = {
        bankroll: state.useAutoBankroll ? state.autoBankrollAmount : state.bankroll,
        target_buy_in: state.targetBuyIn,
        custom_win_rate: state.customWinRate,
        custom_roi: state.customROI,
        simulation_tournaments: 1000,
        simulation_runs: 5000,
        stakes_analysis: [25, 50, 100, 200, 500, 1000],
        ...filtersToQueryParams(filters)
      };

      const results = await calculateVariance(request);
      setState(prev => ({ ...prev, results, loading: false }));
    } catch (error) {
      console.error('Variance calculation failed:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Calculation failed'
      }));
    }
  };

  // Debounced calculation trigger
  const debouncedCalculate = useCallback(
    debounce(calculateVarianceData, 1000),
    [state.bankroll, state.targetBuyIn, state.customWinRate, state.customROI, filters, state.useAutoBankroll, state.autoBankrollAmount]
  );

  useEffect(() => {
    if (state.useAutoBankroll ? state.autoBankrollAmount > 0 : state.bankroll > 0) {
      debouncedCalculate();
    }
  }, [debouncedCalculate]);

  const getRiskColor = (ror: number) => {
    if (ror < 1) return 'text-emerald-400';
    if (ror < 5) return 'text-yellow-400';
    if (ror < 10) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskBgColor = (ror: number) => {
    if (ror < 1) return 'bg-emerald-900';
    if (ror < 5) return 'bg-yellow-900';
    if (ror < 10) return 'bg-orange-900';
    return 'bg-red-900';
  };

  const getKellyStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-emerald-400';
      case 'conservative': case 'very_conservative': return 'text-blue-400';
      case 'aggressive': case 'very_aggressive': return 'text-orange-400';
      case 'no_edge': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ffffff'
        }
      },
    },
    scales: {
      x: {
        ticks: { color: '#ffffff' },
        grid: { color: '#374151' }
      },
      y: {
        ticks: { color: '#ffffff' },
        grid: { color: '#374151' }
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-3">🎯</span>
            Tournament Variance Calculator
          </h2>
          <p className="text-gray-300">Professional bankroll management and risk analysis</p>
        </div>
        <button
          onClick={calculateVarianceData}
          disabled={state.loading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {state.loading ? 'Calculating...' : 'Recalculate'}
        </button>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bankroll Input */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <span className="mr-2">💰</span>
            Current Bankroll
          </h3>
          
          <div className="space-y-3">
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={!state.useAutoBankroll}
                  onChange={() => setState(prev => ({ ...prev, useAutoBankroll: false }))}
                  className="mr-2 text-blue-500"
                />
                <span className="text-gray-300 text-sm">Manual</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={state.useAutoBankroll}
                  onChange={() => setState(prev => ({ ...prev, useAutoBankroll: true }))}
                  className="mr-2 text-blue-500"
                />
                <span className="text-gray-300 text-sm">Auto-Calculate</span>
              </label>
            </div>
            
            {state.useAutoBankroll ? (
              <div>
                <div className="text-2xl font-bold text-emerald-400">
                  ${state.autoBankrollAmount.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400">
                  Estimated from profit history
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  value={state.bankroll}
                  onChange={(e) => setState(prev => ({ ...prev, bankroll: Number(e.target.value) }))}
                  className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-lg font-semibold"
                  placeholder="10000"
                  min="0"
                  step="100"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter your current bankroll
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Target Buy-in */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <span className="mr-2">🎲</span>
            Target Buy-in
          </h3>
          <input
            type="number"
            value={state.targetBuyIn}
            onChange={(e) => setState(prev => ({ ...prev, targetBuyIn: Number(e.target.value) }))}
            className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-lg font-semibold"
            placeholder="100"
            min="1"
            step="5"
          />
          <p className="text-xs text-gray-400 mt-1">
            Tournament buy-in to analyze
          </p>
        </div>

        {/* Player Stats */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <span className="mr-2">📊</span>
            Player Stats
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Win Rate %</label>
              <input
                type="number"
                value={state.customWinRate ? (state.customWinRate * 100).toFixed(1) : ''}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  customWinRate: e.target.value ? Number(e.target.value) / 100 : null
                }))}
                className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm font-semibold"
                placeholder={summary ? `${summary.win_rate.toFixed(1)}% (from data)` : "Enter win rate"}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ROI %</label>
              <input
                type="number"
                value={state.customROI ? (state.customROI * 100).toFixed(1) : ''}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  customROI: e.target.value ? Number(e.target.value) / 100 : null
                }))}
                className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm font-semibold"
                placeholder={summary ? `${summary.roi.toFixed(1)}% (from data)` : "Enter ROI"}
                min="0"
                step="0.1"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {summary ? 'Auto-filled from your data. Edit to override.' : 'Will auto-fill when data loads.'}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300">{state.error}</p>
        </div>
      )}

      {/* Results */}
      {state.results && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Risk of Ruin */}
            <div className={`${getRiskBgColor(state.results.risk_of_ruin.current_stake.ror_percentage)} rounded-lg p-6 border border-gray-600`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Risk of Ruin</p>
                  <p className={`text-3xl font-bold ${getRiskColor(state.results.risk_of_ruin.current_stake.ror_percentage)}`}>
                    {state.results.risk_of_ruin.current_stake.ror_percentage.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    {state.results.risk_of_ruin.current_stake.risk_level}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>

            {/* Kelly Criterion */}
            <div className="bg-blue-900 rounded-lg p-6 border border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Kelly Optimal</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {(state.results.kelly_criterion.optimal_fraction * 100).toFixed(1)}%
                  </p>
                  <p className={`text-xs ${getKellyStatusColor(state.results.kelly_criterion.status)}`}>
                    ${state.results.kelly_criterion.recommended_buy_in.toFixed(0)} recommended
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </div>

            {/* Monte Carlo */}
            <div className="bg-purple-900 rounded-lg p-6 border border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Simulation RoR</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {(state.results.monte_carlo.risk_of_ruin * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    {state.results.calculation_parameters.simulation_runs.toLocaleString()} simulations
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎲</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Risk of Ruin by Stakes */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Risk of Ruin by Stakes</h3>
              <div className="h-64">
                <Bar data={state.results.risk_of_ruin.chart_data} options={chartOptions} />
              </div>
            </div>

            {/* Monte Carlo Percentiles */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Bankroll Projections</h3>
              <div className="h-64">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">
                        ${state.results.monte_carlo.percentiles.p95.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">95th Percentile</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        ${state.results.monte_carlo.percentiles.p50.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">Median</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">
                        ${state.results.monte_carlo.percentiles.p5.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">5th Percentile</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        ${state.results.monte_carlo.peak_bankroll_stats.p95.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">Peak (95%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-400">
                        {state.results.monte_carlo.average_tournaments_played.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-400">Avg Tournaments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-400">
                        ${state.results.monte_carlo.lowest_bankroll_stats.p5.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">Lowest (5%)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kelly Explanation */}
          <div className="mt-8 bg-gradient-to-r from-blue-800 to-purple-800 rounded-xl p-6 border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">💡 Analysis & Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Kelly Criterion</h4>
                <p className="text-gray-300 text-sm">
                  {state.results.kelly_criterion.explanation}
                </p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Player Stats</h4>
                <p className="text-gray-300 text-sm">
                  Win Rate: {(state.results.player_stats.win_rate * 100).toFixed(1)}% | 
                  ROI: {(state.results.player_stats.average_roi * 100).toFixed(1)}% | 
                  Tournaments: {state.results.player_stats.total_tournaments}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading State */}
      {state.loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-300">Calculating variance...</span>
        </div>
      )}
    </div>
  );
};

export default VarianceCalculator;