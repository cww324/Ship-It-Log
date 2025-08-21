"use client";

import { useState, useEffect } from 'react';
import type { Site, FormatTag } from '@/types';
import type {
  FilterState,
  TimeRangeFilter,
  StakesFilter
} from '@/types/filters';
import {
  TIME_RANGE_OPTIONS,
  STAKES_OPTIONS,
  GAME_TYPE_OPTIONS,
  TOURNAMENT_TYPE_OPTIONS,
  SPEED_OPTIONS,
  TABLE_SIZE_OPTIONS,
  DEFAULT_FILTER_STATE
} from '@/types/filters';

interface PokerFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sites: Site[];
  formatTags: FormatTag[];
  className?: string;
}

export default function PokerFilters({ 
  filters, 
  onFiltersChange, 
  sites, 
  formatTags,
  className = ""
}: PokerFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [showCustomStakes, setShowCustomStakes] = useState(false);

  // Update custom date range visibility when time range changes
  useEffect(() => {
    setShowCustomDateRange(filters.timeRange.value === 'custom');
  }, [filters.timeRange.value]);

  // Update custom stakes visibility when stakes filter changes
  useEffect(() => {
    setShowCustomStakes(filters.stakes.value === 'custom');
  }, [filters.stakes.value]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleTimeRangeChange = (value: string) => {
    const timeRange = TIME_RANGE_OPTIONS.find(t => t.value === value) || TIME_RANGE_OPTIONS[4];
    updateFilter('timeRange', timeRange);
  };

  const handleStakesChange = (value: string) => {
    const stakes = STAKES_OPTIONS.find(s => s.value === value) || STAKES_OPTIONS[0];
    updateFilter('stakes', stakes);
  };

  const handleMultiSelectChange = (key: keyof FilterState, value: string | number, checked: boolean) => {
    const currentValues = filters[key] as (string | number)[];
    if (checked) {
      updateFilter(key, [...currentValues, value] as FilterState[typeof key]);
    } else {
      updateFilter(key, currentValues.filter(v => v !== value) as FilterState[typeof key]);
    }
  };

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTER_STATE);
    setShowAdvanced(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.timeRange.value !== 'all') count++;
    if (filters.stakes.value !== 'all') count++;
    if (filters.sites.length > 0) count++;
    if (filters.gameTypes.length > 0) count++;
    if (filters.tournamentTypes.length > 0) count++;
    if (filters.speeds.length > 0) count++;
    if (filters.tableSizes.length > 0) count++;
    if (filters.formatTags.length > 0) count++;
    if (filters.resultsFilter && filters.resultsFilter !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg ${className}`}>
      {/* Basic Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Time Range */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-300 mb-1">Time Period</label>
          <select
            value={filters.timeRange.value}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-700 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TIME_RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stakes */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-300 mb-1">Stakes</label>
          <select
            value={filters.stakes.value}
            onChange={(e) => handleStakesChange(e.target.value)}
            className="border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-700 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {STAKES_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sites */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-300 mb-1">Sites</label>
          <select
            value={filters.sites.length === 1 ? filters.sites[0].toString() : ''}
            onChange={(e) => {
              if (e.target.value) {
                updateFilter('sites', [parseInt(e.target.value)]);
              } else {
                updateFilter('sites', []);
              }
            }}
            className="border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-700 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Sites</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {/* Game Types */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-300 mb-1">Game Type</label>
          <select
            value={filters.gameTypes.length === 1 ? filters.gameTypes[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                updateFilter('gameTypes', [e.target.value]);
              } else {
                updateFilter('gameTypes', []);
              }
            }}
            className="border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-700 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Games</option>
            {GAME_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-300 bg-blue-900 border border-blue-600 rounded-md hover:bg-blue-800 transition-colors"
        >
          <span>+ Advanced Filters</span>
          {activeFilterCount > 4 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {activeFilterCount - 4}
            </span>
          )}
        </button>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Custom Date Range */}
      {showCustomDateRange && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-700 rounded-md">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.customDateRange?.startDate || ''}
              onChange={(e) => updateFilter('customDateRange', {
                startDate: e.target.value,
                endDate: filters.customDateRange?.endDate || ''
              })}
              className="border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={filters.customDateRange?.endDate || ''}
              onChange={(e) => updateFilter('customDateRange', {
                startDate: filters.customDateRange?.startDate || '',
                endDate: e.target.value
              })}
              className="border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-600 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tournament Types */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-300 mb-2">Tournament Types</label>
              <div className="space-y-2">
                {TOURNAMENT_TYPE_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.tournamentTypes.includes(option.value)}
                      onChange={(e) => handleMultiSelectChange('tournamentTypes', option.value, e.target.checked)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Speeds */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-300 mb-2">Speed</label>
              <div className="space-y-2">
                {SPEED_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.speeds.includes(option.value)}
                      onChange={(e) => handleMultiSelectChange('speeds', option.value, e.target.checked)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Table Sizes */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-300 mb-2">Table Size</label>
              <div className="space-y-2">
                {TABLE_SIZE_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.tableSizes.includes(option.value)}
                      onChange={(e) => handleMultiSelectChange('tableSizes', option.value, e.target.checked)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Results Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-300 mb-1">Results</label>
              <select
                value={filters.resultsFilter || 'all'}
                onChange={(e) => updateFilter('resultsFilter', e.target.value as 'all' | 'winning' | 'losing' | 'breakeven')}
                className="border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-700 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Results</option>
                <option value="winning">Winning Only</option>
                <option value="losing">Losing Only</option>
                <option value="breakeven">Break-even Only</option>
              </select>
            </div>

            {/* Format Tags */}
            {formatTags.length > 0 && (
              <div className="flex flex-col md:col-span-2">
                <label className="text-xs font-medium text-gray-300 mb-2">Format Tags</label>
                <div className="flex flex-wrap gap-2">
                  {formatTags.map(tag => (
                    <label key={tag.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.formatTags.includes(tag.id)}
                        onChange={(e) => handleMultiSelectChange('formatTags', tag.id, e.target.checked)}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-300">{tag.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="border-t border-gray-600 pt-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium text-gray-300">Active filters:</span>
            
            {filters.timeRange.value !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                {filters.timeRange.label}
                <button
                  onClick={() => handleTimeRangeChange('all')}
                  className="ml-1 text-blue-300 hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            )}

            {filters.stakes.value !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                {filters.stakes.label}
                <button
                  onClick={() => handleStakesChange('all')}
                  className="ml-1 text-green-300 hover:text-green-200"
                >
                  ×
                </button>
              </span>
            )}

            {filters.sites.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900 text-purple-300">
                {sites.find(s => s.id === filters.sites[0])?.name || 'Selected Site'}
                <button
                  onClick={() => updateFilter('sites', [])}
                  className="ml-1 text-purple-300 hover:text-purple-200"
                >
                  ×
                </button>
              </span>
            )}

            {filters.gameTypes.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-900 text-orange-300">
                {filters.gameTypes.join(', ')}
                <button
                  onClick={() => updateFilter('gameTypes', [])}
                  className="ml-1 text-orange-300 hover:text-orange-200"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}