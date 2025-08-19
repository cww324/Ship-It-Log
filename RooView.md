# 🚀 Ship-It-Log Project Overview - RooView

## 📋 Project Summary
**Ship-It-Log** is a comprehensive poker session tracking application with advanced analytics, real-time tournament management, and performance insights. Built with Django REST Framework backend and Next.js frontend.

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.2.5 with Django REST Framework 3.16.1
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **Analytics**: Pandas 2.2.0 + NumPy 1.26.0 for data processing
- **Authentication**: Token-based authentication
- **CORS**: django-cors-headers 4.7.0
- **Filtering**: django-filter 25.1
- **Image Processing**: Pillow 11.3.0

### Frontend
- **Framework**: Next.js 15.4.6 with React 19.1.0
- **Styling**: Tailwind CSS 4.0
- **Charts**: Chart.js 4.5.0 + react-chartjs-2 5.3.0
- **HTTP Client**: Axios 1.11.0
- **Language**: TypeScript 5.x
- **Linting**: ESLint 9.x

## 🔧 Development Environment

### Virtual Environment
```bash
# Activate virtual environment
source ~/.venvs/shipitlog/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend && npm install
```

### Development Servers
```bash
# Backend (Django)
cd backend && python manage.py runserver

# Frontend (Next.js)
cd frontend && npm run dev
```

## 📊 Database Models

### Core Models
1. **User** - Django's built-in user model
2. **Site** - Poker sites (online/live venues)
3. **FormatTag** - Tournament format tags (PKO, Turbo, etc.)
4. **Tournament** - Individual tournament entries
5. **Session** - Poker session groupings
6. **SessionTournament** - Many-to-many relationship

### Tournament Fields
- Basic: name, site, buy_in, prize_won, bounties_won
- Timing: start_time, end_time
- Structure: type (MTT/SAT), game (NLHE/PLO/etc.), speed, table_size
- Satellite: target_name, seat_value
- Tracking: entries_used, rebuys, addons
- Tags: format_tags (many-to-many)

## 🎯 Current Features

### ✅ Completed Features

#### 1. **Modern Landing Page** (`/`)
- Gradient hero section with compelling copy
- Feature showcase with poker-specific benefits
- Future leaderboard preview section
- Responsive design with modern UI
- Proper authentication flow

#### 2. **Authentication System**
- User registration and login
- Token-based authentication
- Protected routes with auth guards
- Conditional header display

#### 3. **Dashboard** (`/dashboard`)
- Tabbed interface (Dashboard, Sessions)
- Quick stats cards (profit, ROI, win rate)
- Recent sessions table
- Performance comparison (online vs live)
- Session extremes (best/worst)
- Export functionality (CSV, JSON)

#### 4. **Analytics Page** (`/analytics`) 🆕
- **Backend**: Pandas-powered analytics endpoints
- **Charts**: 6 different visualization types
  - Profit over time (line chart)
  - Monthly performance (bar chart)
  - Win/Loss distribution (pie chart)
  - Game type analysis (bar chart)
  - Session length vs profit (scatter plot)
- **Summary Cards**: Key performance indicators
- **Insights**: Automated analysis of trends

#### 5. **Session Management**
- Session listing (`/sessions`)
- Detailed session view (`/sessions/[id]`)
- Tournament creation and management
- Real-time tournament actions (rebuy, bust, finish)
- Quick tournament entry

#### 6. **Tournament Features**
- Comprehensive tournament tracking
- Multiple game types (NLHE, PLO, PLO5, PLO8, Mixed)
- Speed variants (Regular, Turbo, Hyper, Deepstack)
- Table sizes (Full, 8-max, 6-max, Heads-up)
- Satellite support with target tracking
- Format tags system

### 🚧 In Progress / Planned Features

#### 7. **Enhanced Session Tracking**
- [ ] Real-time session tracking improvements
- [ ] Quick "register for tournament" flow
- [ ] Live session totals and running calculations
- [ ] Mobile-optimized session tracking

#### 8. **Advanced Filtering & Search**
- [ ] Multi-criteria search (dates, sites, types, profit ranges)
- [ ] Saved filter combinations
- [ ] Advanced sorting options
- [ ] Pagination for large datasets

#### 9. **Session Redesign** (`/sessions/[id]`)
- [ ] Streamlined real-time tournament tracking
- [ ] Better UX for active session management
- [ ] Quick action buttons optimization
- [ ] Mobile-responsive improvements

#### 10. **Enhanced Analytics**
- [ ] Session comparison tools
- [ ] Trend analysis components
- [ ] Variance calculations
- [ ] Hourly rate tracking
- [ ] Best/worst streak analysis

## 🗂️ File Structure

### Backend (`/backend`)
```
backend/
├── manage.py
├── requirements.txt
├── shipitlog/          # Django project settings
├── api/
│   ├── models.py       # Database models
│   ├── serializers.py  # DRF serializers
│   ├── urls.py         # API routing
│   ├── views/          # API views
│   │   ├── analytics_view.py  # 🆕 Pandas analytics
│   │   ├── auth_view.py
│   │   ├── session_view.py
│   │   └── tournament_view.py
│   └── migrations/     # Database migrations
```

### Frontend (`/frontend`)
```
frontend/
├── package.json
├── src/
│   ├── app/
│   │   ├── page.tsx           # 🆕 Modern landing page
│   │   ├── dashboard/         # 🆕 Authenticated dashboard
│   │   ├── analytics/         # 🆕 Analytics with charts
│   │   ├── sessions/          # Session management
│   │   ├── login/             # Authentication
│   │   └── layout.tsx         # 🆕 Conditional header
│   ├── components/
│   │   ├── ConditionalHeader.tsx  # 🆕 Smart header
│   │   ├── SiteSelect.tsx
│   │   └── TagMultiSelect.tsx
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   └── export.ts          # Data export utilities
│   └── types/                 # TypeScript definitions
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/token/` - Login
- `POST /api/auth/register/` - Registration
- `GET /api/auth/profile/` - User profile

### Core Resources
- `/api/tournaments/` - Tournament CRUD
- `/api/sessions/` - Session CRUD
- `/api/sites/` - Poker sites
- `/api/format-tags/` - Tournament tags
- `/api/session-tournaments/` - Session-tournament links

### Analytics 🆕
- `GET /api/analytics/summary/` - Key performance metrics
- `GET /api/analytics/profit-over-time/` - Cumulative profit chart data
- `GET /api/analytics/monthly-performance/` - Monthly breakdown
- `GET /api/analytics/win-loss-distribution/` - Win/loss pie chart
- `GET /api/analytics/game-type-analysis/` - Performance by game type
- `GET /api/analytics/session-length-vs-profit/` - Correlation analysis

## 🎨 Design System

### Colors
- **Primary**: Blue (bg-blue-600, text-blue-600)
- **Success**: Green (text-green-600)
- **Danger**: Red (text-red-600)
- **Neutral**: Gray scale
- **Gradients**: Blue to purple for hero sections

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Consistent padding, hover states
- **Tables**: Striped rows, hover effects
- **Charts**: Consistent color scheme across visualizations

## 🚀 Recent Updates

### Latest Session (Current)
1. ✅ Created modern landing page with Tailwind
2. ✅ Implemented comprehensive analytics system
3. ✅ Added pandas-powered backend analytics
4. ✅ Built Chart.js frontend visualizations
5. ✅ Updated navigation and routing

### Next Priority Tasks
1. 🎯 Redesign sessions/[id] page for real-time tracking
2. 🎯 Create quick tournament registration flow
3. 🎯 Implement advanced filtering and search
4. 🎯 Add live session tracking features

## 💡 Development Notes

### Key Patterns
- **Authentication**: Token stored in localStorage, auth guards on protected routes
- **API Calls**: Centralized in `/lib/api.ts` with error handling
- **State Management**: React hooks with useCallback for optimization
- **Data Processing**: Pandas in backend, Chart.js for visualization
- **Responsive Design**: Mobile-first with Tailwind utilities

### Performance Considerations
- Pandas processing on backend for heavy analytics
- Chart.js for interactive frontend visualizations
- Efficient data loading with Promise.all
- Proper loading states and error handling

### Code Quality
- TypeScript for type safety
- ESLint for code consistency
- Modular component architecture
- Clear separation of concerns

---

**Last Updated**: 2024-12-19  
**Version**: 2.0 (Analytics Update)  
**Status**: Active Development