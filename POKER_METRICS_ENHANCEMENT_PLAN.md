# 🎯 Poker Metrics Enhancement Plan

## 🎲 Current Improvements to Implement

### 1. **Dashboard Metrics Overhaul**
- ✅ Change "Win Rate" → **"ITM%" (In The Money %)**
- ✅ Add **"Total ROI"** as separate metric
- ✅ Move settings button near +Add Session button
- ✅ Softer color scheme (off-black/grey backgrounds, softer whites)

### 2. **Enhanced Session Extremes**
- ✅ **Best Day**: Clickable link to best session page
- ✅ **Worst Day**: Clickable link to worst session page
- ✅ **Best Tournament**: Most profitable tournament (10-15+ entries minimum) with ROI
- ✅ **Worst Tournament**: Least profitable tournament (10-15+ entries minimum) with ROI

### 3. **Rake Tracking System** 🆕
- ✅ **Total Rake Paid**: Display total rake across all tournaments
- ✅ **Clickable Rake Breakdown**: Navigate to detailed rake analysis by site
- ✅ **Rakeback Settings**: Configure rakeback % per site in settings
- ✅ **Expected Rakeback**: Calculate potential rakeback earnings

## 📊 Future Poker Metrics (Todo List)

### Tournament-Specific Metrics
- [ ] **Total MTT Wins**: Count of tournament victories
- [ ] **Final Table Rate**: % of tournaments reaching final table
- [ ] **Bubble Rate**: % of tournaments busting near money
- [ ] **Average Field Size**: Track tournament sizes played
- [ ] **Heads-Up Win Rate**: Performance in heads-up situations

### Advanced Analytics
- [ ] **Variance Analysis**: Calculate standard deviation and downswings
- [ ] **Hourly Rate**: $/hour across all sessions
- [ ] **Best/Worst Time Periods**: Performance by time of day/week
- [ ] **Streak Tracking**: Current winning/losing streaks
- [ ] **Tournament Type Analysis**: Performance by buy-in levels

### Bankroll Management
- [ ] **Bankroll Graph**: Visual representation over time
- [ ] **Risk of Ruin**: Calculate probability of going broke
- [ ] **Recommended Stakes**: Suggest appropriate buy-in levels
- [ ] **Goal Tracking**: Set and track profit/volume goals

### Site-Specific Features
- [ ] **Site Comparison**: Performance across different sites
- [ ] **Rakeback Optimization**: Suggest best sites for rakeback
- [ ] **VIP Progress**: Track loyalty program status
- [ ] **Bonus Clearing**: Monitor bonus requirements

## 🎨 Enhanced Dashboard Layout

### New Stats Cards Layout:
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   +$12,450  │ │    67.2%    │ │    24.3%    │ │   $2,450    │
│ Total Profit│ │   ITM%      │ │ Total ROI   │ │ Total Rake  │
│ 156 cashes  │ │ 232 tourneys│ │ 89 sessions │ │ (clickable) │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Enhanced Session Extremes:
```
┌─────────────────────────────────────────────────────────────┐
│ 📈 PERFORMANCE HIGHLIGHTS                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Best Day: +$1,250 → [View Session #47]                     │
│ Worst Day: -$890 → [View Session #23]                      │
│                                                             │
│ Best Tournament: $33 Sunday Storm (15 entries)             │
│ Profit: +$2,100 • ROI: 327% → [View Details]               │
│                                                             │
│ Worst Tournament: $109 Big Stack (12 entries)              │
│ Loss: -$980 • ROI: -75% → [View Details]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Rake Breakdown Page:
```
┌─────────────────────────────────────────────────────────────┐
│ 💰 RAKE ANALYSIS                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Total Rake Paid: $3,450                                    │
│ Expected Rakeback: $1,035 (30% avg)                        │
│ Net Rake Cost: $2,415                                      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Site Breakdown:                                         │ │
│ │                                                         │ │
│ │ PokerStars    $1,200 rake • 30% RB = $360 back        │ │
│ │ GGPoker       $890 rake • 35% RB = $312 back           │ │
│ │ PartyPoker    $760 rake • 25% RB = $190 back           │ │
│ │ Live Casino   $600 rake • 0% RB = $0 back              │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation Priority

### Phase 1: Core Improvements (Current)
1. ✅ ITM% and Total ROI metrics
2. ✅ Enhanced session extremes with links
3. ✅ Best/worst tournament analysis
4. ✅ Softer color scheme
5. ✅ Settings button repositioning

### Phase 2: Rake System
1. [ ] Rake calculation and tracking
2. [ ] Rakeback settings in settings page
3. [ ] Rake breakdown page
4. [ ] Expected rakeback calculations

### Phase 3: Advanced Metrics
1. [ ] Tournament-specific analytics
2. [ ] Variance and risk analysis
3. [ ] Bankroll management tools
4. [ ] Advanced filtering and comparisons

## 💡 Additional Poker-Specific Ideas

### Tournament Analysis
- **Field Size Impact**: How performance varies by tournament size
- **Late Registration Analysis**: Performance when late-regging vs on-time
- **Rebuy Strategy**: Optimal rebuy frequency analysis
- **Satellite ROI**: Separate tracking for satellite tournaments

### Session Optimization
- **Session Length Analysis**: Optimal session duration
- **Fatigue Factor**: Performance degradation over long sessions
- **Multi-tabling Analysis**: Performance vs number of tables
- **Break Analysis**: Impact of breaks on performance

### Psychological Metrics
- **Tilt Indicators**: Identify patterns that lead to poor performance
- **Confidence Tracking**: Correlation between confidence and results
- **Streak Psychology**: How streaks affect decision making
- **Bankroll Pressure**: Performance under different bankroll pressures

### Social Features (Future)
- **Study Group Integration**: Share hand histories and analysis
- **Coaching Tools**: Track improvement over time
- **Leaderboards**: Compare with other players (anonymized)
- **Achievement System**: Unlock badges for milestones

---

**Goal**: Create the most comprehensive and professional poker tracking application with industry-leading metrics and analysis tools.