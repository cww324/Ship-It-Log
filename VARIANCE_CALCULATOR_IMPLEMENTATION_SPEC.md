# Tournament Variance Calculator - Implementation Specification

## Overview
This document provides a comprehensive technical specification for implementing a tournament variance calculator in the Ship-It-Log analytics dashboard. The calculator will provide professional-level bankroll management insights using multiple mathematical models.

## Mathematical Algorithms

### 1. Kelly Criterion Implementation
```python
def kelly_criterion(win_rate: float, average_roi: float) -> float:
    """
    Calculate optimal bet sizing using Kelly Criterion
    Formula: f = (bp - q) / b
    where f=fraction to bet, b=odds, p=win probability, q=lose probability
    """
    if win_rate <= 0 or average_roi <= 0:
        return 0.0
    
    b = average_roi / win_rate  # Expected return per win
    p = win_rate
    q = 1 - win_rate
    
    kelly_fraction = (b * p - q) / b
    return max(0.0, min(1.0, kelly_fraction))
```

### 2. Risk of Ruin Formula
```python
def risk_of_ruin_formula(bankroll: float, buy_in: float, win_rate: float, average_roi: float) -> float:
    """
    Calculate risk of ruin using standard poker formula
    Formula: RoR = ((1-edge)/(1+edge))^(bankroll/buy_in)
    """
    if bankroll <= 0 or buy_in <= 0 or win_rate <= 0:
        return 1.0
    
    edge = win_rate * (1 + average_roi) - 1
    
    if edge <= 0:
        return 1.0
    
    buy_ins = bankroll / buy_in
    ratio = (1 - edge) / (1 + edge)
    ror = ratio ** buy_ins
    return min(1.0, max(0.0, ror))
```

### 3. Tournament Variance Calculation
```python
def tournament_variance(buy_in: float, win_rate: float, average_roi: float) -> Dict[str, float]:
    """
    Calculate tournament variance metrics
    """
    ev = buy_in * (win_rate * (1 + average_roi) - 1)
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
```

### 4. Monte Carlo Simulation
```python
def monte_carlo_simulation(initial_bankroll: float, buy_in: float, win_rate: float, 
                         average_roi: float, num_tournaments: int = 1000, 
                         num_simulations: int = 10000) -> Dict:
    """
    Run Monte Carlo simulation for bankroll projections
    Returns comprehensive simulation results with percentiles and risk metrics
    """
    results = []
    
    for _ in range(num_simulations):
        bankroll = initial_bankroll
        bankroll_history = [bankroll]
        tournaments_played = 0
        
        for tournament in range(num_tournaments):
            if bankroll < buy_in:
                break
            
            bankroll -= buy_in
            tournaments_played += 1
            
            if random.random() < win_rate:
                bankroll += buy_in * (1 + average_roi)
            
            bankroll_history.append(bankroll)
        
        results.append({
            'final_bankroll': bankroll,
            'bankroll_history': bankroll_history,
            'tournaments_played': tournaments_played,
            'went_broke': bankroll < buy_in,
            'peak_bankroll': max(bankroll_history),
            'lowest_bankroll': min(bankroll_history)
        })
    
    return analyze_results(results)
```

## Backend Implementation

### File Structure
```
backend/api/utils/
├── __init__.py
└── variance_calculator.py

backend/api/views/
└── variance_view.py (new)
```

### API Endpoint Design

#### Endpoint: `/analytics/variance-calculator/`
**Method:** POST
**Purpose:** Calculate comprehensive variance metrics

**Request Body:**
```json
{
  "bankroll": 10000,
  "target_buy_in": 100,
  "custom_win_rate": null,  // Optional override
  "custom_roi": null,       // Optional override
  "simulation_tournaments": 1000,
  "simulation_runs": 10000,
  "stakes_analysis": [50, 100, 200, 500],
  "filters": {
    // Same filter structure as existing analytics
    "date_from": "2024-01-01",
    "date_to": "2024-12-31",
    "sites": [1, 2],
    "game_types": ["NLHE"],
    // ... other filters
  }
}
```

**Response Structure:**
```json
{
  "player_stats": {
    "total_tournaments": 150,
    "win_rate": 0.15,
    "average_roi": 0.25,
    "total_profit": 2500,
    "total_volume": 15000
  },
  "kelly_criterion": {
    "optimal_fraction": 0.08,
    "recommended_buy_in": 800,
    "explanation": "Kelly suggests risking 8% of bankroll"
  },
  "risk_of_ruin": {
    "current_stake": {
      "buy_in": 100,
      "ror_percentage": 2.5,
      "risk_level": "low"
    },
    "stakes_analysis": [
      {
        "buy_in": 50,
        "ror_percentage": 0.1,
        "buy_ins_available": 200,
        "risk_level": "very_low"
      },
      {
        "buy_in": 100,
        "ror_percentage": 2.5,
        "buy_ins_available": 100,
        "risk_level": "low"
      }
    ]
  },
  "monte_carlo": {
    "risk_of_ruin": 0.025,
    "median_final_bankroll": 12500,
    "percentiles": {
      "p5": 5000,
      "p25": 8000,
      "p50": 12500,
      "p75": 18000,
      "p95": 25000
    },
    "confidence_intervals": {
      "tournament_100": {"p5": 9500, "p50": 11000, "p95": 13500},
      "tournament_500": {"p5": 8000, "p50": 15000, "p95": 22000}
    }
  },
  "bankroll_recommendations": {
    "conservative": {
      "ror_1_percent": 15000,
      "ror_5_percent": 8000
    },
    "aggressive": {
      "ror_10_percent": 5000,
      "ror_20_percent": 3000
    }
  },
  "variance_metrics": {
    "expected_value_per_tournament": 15,
    "standard_deviation": 450,
    "coefficient_of_variation": 30
  }
}
```

### Data Integration Strategy

#### Historical Data Analysis
```python
def calculate_player_stats(user, filters):
    """
    Calculate player statistics from historical tournament data
    Uses existing filter system from analytics_view.py
    """
    tournaments = Tournament.objects.filter(
        tournament_sessions__session__user=user
    ).select_related('site')
    
    # Apply existing filters
    tournaments = apply_tournament_filters(tournaments, filters)
    
    # Calculate win rate, ROI, variance from actual data
    stats = analyze_tournament_performance(tournaments)
    
    return {
        'win_rate': stats['win_rate'],
        'average_roi': stats['average_roi'],
        'total_tournaments': stats['count'],
        'variance': stats['variance'],
        'total_profit': stats['total_profit'],
        'total_volume': stats['total_volume']
    }
```

#### Auto-Bankroll Calculation
```python
def calculate_current_bankroll(user, starting_bankroll=None):
    """
    Calculate current bankroll from profit history
    """
    if starting_bankroll:
        # Use provided starting bankroll + total profit
        total_profit = get_total_profit(user)
        return starting_bankroll + total_profit
    else:
        # Estimate based on recent volume and current profit
        return estimate_bankroll_from_activity(user)
```

## Frontend Implementation

### Component Structure
```
frontend/src/components/
├── VarianceCalculator/
│   ├── index.tsx
│   ├── BankrollInput.tsx
│   ├── VarianceCharts.tsx
│   ├── RiskOfRuinDisplay.tsx
│   ├── KellyCriterionPanel.tsx
│   └── MonteCarloResults.tsx
```

### Main Component Integration
```typescript
// Add to analytics/page.tsx
import VarianceCalculator from '@/components/VarianceCalculator';

// Add new section after existing variance analysis
<VarianceCalculator 
  filters={filters}
  onFiltersChange={handleFiltersChange}
  summary={summary}
/>
```

### Chart Visualizations

#### 1. Risk of Ruin vs Buy-in Level
```typescript
const riskOfRuinChart = {
  type: 'line',
  data: {
    labels: ['$25', '$50', '$100', '$200', '$500'],
    datasets: [{
      label: 'Risk of Ruin %',
      data: [0.1, 1.2, 5.5, 15.8, 45.2],
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)'
    }]
  }
};
```

#### 2. Bankroll Projection with Confidence Intervals
```typescript
const bankrollProjection = {
  type: 'line',
  data: {
    labels: tournaments_range,
    datasets: [
      {
        label: 'Median Projection',
        data: median_values,
        borderColor: 'rgb(59, 130, 246)'
      },
      {
        label: '95th Percentile',
        data: p95_values,
        borderColor: 'rgb(16, 185, 129)',
        borderDash: [5, 5]
      },
      {
        label: '5th Percentile',
        data: p5_values,
        borderColor: 'rgb(239, 68, 68)',
        borderDash: [5, 5]
      }
    ]
  }
};
```

#### 3. Kelly Criterion Recommendations
```typescript
const kellyDisplay = {
  optimal_fraction: 0.08,
  recommended_buy_in: 800,
  current_buy_in: 100,
  status: 'conservative', // conservative, optimal, aggressive
  explanation: 'Current play is more conservative than Kelly optimal'
};
```

### User Interface Design

#### Bankroll Input Section
```typescript
interface BankrollInputProps {
  value: number;
  onChange: (value: number) => void;
  autoCalculated: number;
  useAutoCalculated: boolean;
  onToggleAuto: (use: boolean) => void;
}

const BankrollInput: React.FC<BankrollInputProps> = ({
  value, onChange, autoCalculated, useAutoCalculated, onToggleAuto
}) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Current Bankroll</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={!useAutoCalculated}
              onChange={() => onToggleAuto(false)}
              className="mr-2"
            />
            <span className="text-gray-300">Manual Input</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="radio"
              checked={useAutoCalculated}
              onChange={() => onToggleAuto(true)}
              className="mr-2"
            />
            <span className="text-gray-300">Auto-Calculate</span>
          </label>
        </div>
        
        {useAutoCalculated ? (
          <div className="text-2xl font-bold text-emerald-400">
            ${autoCalculated.toLocaleString()}
            <p className="text-sm text-gray-400">Based on profit history</p>
          </div>
        ) : (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
            placeholder="Enter bankroll amount"
          />
        )}
      </div>
    </div>
  );
};
```

## Integration Points

### 1. URL Routing
Add new endpoint to `backend/api/urls.py`:
```python
path("analytics/variance-calculator/", variance_view.variance_calculator, name="variance_calculator"),
```

### 2. API Client
Add to `frontend/src/lib/api.ts`:
```typescript
export async function calculateVariance(data: VarianceCalculatorRequest): Promise<VarianceCalculatorResponse> {
  return apiPost('/analytics/variance-calculator/', data);
}
```

### 3. Type Definitions
Add to `frontend/src/types/analytics.ts`:
```typescript
export interface VarianceCalculatorRequest {
  bankroll: number;
  target_buy_in: number;
  custom_win_rate?: number;
  custom_roi?: number;
  simulation_tournaments?: number;
  simulation_runs?: number;
  stakes_analysis?: number[];
  filters?: FilterState;
}

export interface VarianceCalculatorResponse {
  player_stats: PlayerStats;
  kelly_criterion: KellyCriterion;
  risk_of_ruin: RiskOfRuin;
  monte_carlo: MonteCarloResults;
  bankroll_recommendations: BankrollRecommendations;
  variance_metrics: VarianceMetrics;
}
```

## Performance Considerations

### 1. Caching Strategy
- Cache Monte Carlo results for common parameter combinations
- Use Redis for session-based caching of expensive calculations
- Implement progressive loading for complex simulations

### 2. Optimization Techniques
- Limit Monte Carlo simulations to reasonable bounds (max 50,000 runs)
- Use numpy for vectorized calculations where possible
- Implement request debouncing on frontend for real-time updates

### 3. Error Handling
- Validate input parameters (positive bankroll, reasonable win rates)
- Handle edge cases (zero win rate, infinite variance)
- Provide meaningful error messages for invalid scenarios

## Testing Strategy

### 1. Unit Tests
- Test all mathematical functions with known inputs/outputs
- Validate edge cases and boundary conditions
- Cross-reference with established poker calculators

### 2. Integration Tests
- Test API endpoint with various filter combinations
- Validate data integration with existing tournament data
- Test performance with large datasets

### 3. User Acceptance Testing
- Verify calculations match expectations for known scenarios
- Test UI responsiveness and usability
- Validate explanations and recommendations are clear

## Documentation Requirements

### 1. User Documentation
- Explanation of variance concepts for poker players
- Interpretation guide for Kelly Criterion recommendations
- Risk level explanations (conservative vs aggressive)

### 2. Technical Documentation
- API endpoint documentation
- Mathematical formula references
- Integration guide for future enhancements

## Implementation Priority

### Phase 1: Core Mathematics (High Priority)
- Implement variance calculation utilities
- Create basic API endpoint
- Add simple frontend integration

### Phase 2: Advanced Features (Medium Priority)
- Monte Carlo simulations
- Multiple chart visualizations
- Kelly Criterion recommendations

### Phase 3: Polish & Optimization (Low Priority)
- Performance optimizations
- Advanced UI features
- Comprehensive testing

This specification provides a complete roadmap for implementing the tournament variance calculator. The design integrates seamlessly with the existing analytics infrastructure while providing professional-level bankroll management insights.