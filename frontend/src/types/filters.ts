export interface FilterState {
  timeRange: TimeRangeFilter;
  stakes: StakesFilter;
  sites: number[];
  gameTypes: string[];
  tournamentTypes: string[];
  speeds: string[];
  tableSizes: string[];
  formatTags: number[];
  customDateRange?: {
    startDate: string;
    endDate: string;
  };
  resultsFilter?: 'all' | 'winning' | 'losing' | 'breakeven';
}

export interface TimeRangeFilter {
  value: 'last30' | 'last90' | 'last180' | 'last365' | 'all' | 'custom';
  label: string;
}

export interface StakesFilter {
  value: 'all' | 'small' | 'medium' | 'high' | 'custom';
  label: string;
  min?: number;
  max?: number;
}

export const TIME_RANGE_OPTIONS: TimeRangeFilter[] = [
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 3 months' },
  { value: 'last180', label: 'Last 6 months' },
  { value: 'last365', label: 'Last year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' }
];

export const STAKES_OPTIONS: StakesFilter[] = [
  { value: 'all', label: 'All Stakes' },
  { value: 'small', label: 'Small ($0-55)', min: 0, max: 55 },
  { value: 'medium', label: 'Medium ($55-215)', min: 55, max: 215 },
  { value: 'high', label: 'High ($215+)', min: 215 },
  { value: 'custom', label: 'Custom range' }
];

export const GAME_TYPE_OPTIONS = [
  { value: 'NLHE', label: 'NLHE' },
  { value: 'PLO', label: 'PLO' },
  { value: 'PLO5', label: 'PLO5' },
  { value: 'PLO8', label: 'PLO8' },
  { value: 'MIXED', label: 'Mixed' }
];

export const TOURNAMENT_TYPE_OPTIONS = [
  { value: 'MTT', label: 'MTT' },
  { value: 'SAT', label: 'Satellite' }
];

export const SPEED_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'turbo', label: 'Turbo' },
  { value: 'hyper', label: 'Hyper' },
  { value: 'deepstack', label: 'Deepstack' }
];

export const TABLE_SIZE_OPTIONS = [
  { value: 'full', label: 'Full Ring' },
  { value: '8max', label: '8-max' },
  { value: '6max', label: '6-max' },
  { value: 'hu', label: 'Heads-up' }
];

export const DEFAULT_FILTER_STATE: FilterState = {
  timeRange: TIME_RANGE_OPTIONS[4], // All time
  stakes: STAKES_OPTIONS[0], // All stakes
  sites: [],
  gameTypes: [],
  tournamentTypes: [],
  speeds: [],
  tableSizes: [],
  formatTags: [],
  resultsFilter: 'all'
};

// Helper function to convert filter state to API query parameters
export function filtersToQueryParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {};

  // Time range
  if (filters.timeRange.value !== 'all') {
    if (filters.timeRange.value === 'custom' && filters.customDateRange) {
      params.date_from = filters.customDateRange.startDate;
      params.date_to = filters.customDateRange.endDate;
    } else {
      const daysMap: Record<string, number> = {
        last30: 30,
        last90: 90,
        last180: 180,
        last365: 365
      };
      
      const days = daysMap[filters.timeRange.value];
      if (days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        params.date_from = date.toISOString().split('T')[0];
      }
    }
  }

  // Stakes
  if (filters.stakes.value !== 'all') {
    if (filters.stakes.value === 'custom') {
      // Custom stakes will be handled separately
    } else {
      const stakes = STAKES_OPTIONS.find(s => s.value === filters.stakes.value);
      if (stakes?.min !== undefined) params.buy_in_min = stakes.min.toString();
      if (stakes?.max !== undefined) params.buy_in_max = stakes.max.toString();
    }
  }

  // Sites
  if (filters.sites.length > 0) {
    params.sites = filters.sites.join(',');
  }

  // Game types
  if (filters.gameTypes.length > 0) {
    params.game_types = filters.gameTypes.join(',');
  }

  // Tournament types
  if (filters.tournamentTypes.length > 0) {
    params.tournament_types = filters.tournamentTypes.join(',');
  }

  // Speeds
  if (filters.speeds.length > 0) {
    params.speeds = filters.speeds.join(',');
  }

  // Table sizes
  if (filters.tableSizes.length > 0) {
    params.table_sizes = filters.tableSizes.join(',');
  }

  // Format tags
  if (filters.formatTags.length > 0) {
    params.format_tags = filters.formatTags.join(',');
  }

  // Results filter
  if (filters.resultsFilter && filters.resultsFilter !== 'all') {
    params.results_filter = filters.resultsFilter;
  }

  return params;
}