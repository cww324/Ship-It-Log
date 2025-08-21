# Profit Discrepancy and Variance Calculator Fixes

## Issue 1: Profit Discrepancy Between Dashboard and Analytics

### Root Cause Analysis:
- **Dashboard**: Calculates profit from filtered tournaments in frontend state
- **Analytics**: Calculates profit from backend with `apply_tournament_filters`
- **Potential Issues**:
  1. Different filtering logic between frontend and backend
  2. Different data loading (dashboard uses `no_pagination: 'true'`, analytics uses filtered queries)
  3. Possible caching or timing issues

### Solution:
1. **Standardize Calculation Method**: Both should use the same backend endpoint
2. **Fix Analytics Summary**: Ensure it uses the same filtering as dashboard
3. **Add Debug Logging**: To identify where the discrepancy occurs

## Issue 2: Variance Calculator Improvements

### Current Issues:
- Win rate and ROI fields are empty by default
- Variance calculator is at the bottom of the page
- Should auto-populate from existing analytics data

### Required Changes:
1. **Auto-populate Stats**: Use summary data to pre-fill win rate and ROI
2. **Move Position**: Place variance calculator after "Profit Over Time" section
3. **Remove Manual Override**: Make custom stats truly optional
4. **Better Integration**: Use existing analytics data for calculations

## Implementation Plan:

### Step 1: Fix Profit Calculation Consistency
```python
# In analytics_view.py - ensure analytics_summary uses same logic as dashboard
def analytics_summary(request):
    # Use same tournament filtering as dashboard
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    # Apply filters consistently
    tournaments = apply_tournament_filters(tournaments, request)
```

### Step 2: Update Variance Calculator Component
```typescript
// Auto-populate from summary data
useEffect(() => {
  if (summary && summary.total_tournaments > 0) {
    setState(prev => ({
      ...prev,
      customWinRate: summary.win_rate / 100, // Convert percentage to decimal
      customROI: summary.roi / 100 // Convert percentage to decimal
    }));
  }
}, [summary]);
```

### Step 3: Move Variance Calculator Position
```typescript
// In analytics/page.tsx - move variance calculator after profit over time
{/* Charts Grid */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  {/* Profit Over Time */}
  <div>...</div>
  
  {/* Monthly Performance */}
  <div>...</div>
</div>

{/* Variance Calculator - MOVED HERE */}
<VarianceCalculator 
  filters={filters}
  onFiltersChange={handleFiltersChange}
  summary={summary}
/>

{/* Rest of charts... */}
```

### Step 4: Debug Profit Calculation
```typescript
// Add debug logging to both dashboard and analytics
console.log('Dashboard Profit Calculation:', {
  tournaments: tournaments.length,
  totalBuyins: totalBuyins,
  totalPrizes: totalPrizes,
  net: net,
  filters: filters
});
```

## Expected Results:
1. **Consistent Profit Numbers**: Dashboard and analytics show same total profit
2. **Auto-populated Variance Calculator**: Win rate and ROI pre-filled from user data
3. **Better UX**: Variance calculator prominently placed and immediately useful
4. **Accurate Calculations**: All variance metrics based on consistent data