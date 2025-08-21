# ⚙️ Settings Page Design Specification

## 🎯 Overview
Create a comprehensive settings page that allows users to customize their poker tracking experience with custom sites, venues, and tournament templates.

## 🎨 Design Philosophy
**Match Landing Page Theme**: Use the beautiful blue-to-purple gradient color scheme from the landing page instead of the current indigo/slate colors.

### Landing Page Color Palette:
- **Primary Gradient**: `from-blue-500 to-purple-600`
- **Background**: `from-slate-900 via-blue-900 to-slate-900`
- **Text**: White on dark, `text-blue-400` for accents
- **Cards**: `from-gray-800 to-gray-900` with `border-gray-700`
- **Success**: `text-green-400`
- **Buttons**: `from-blue-500 to-purple-600` gradients

## 📱 Settings Page Layout

### Navigation Access
```
Dashboard Header:
┌─────────────────────────────────────────────────────────┐
│ 🏠 Dashboard | 📊 Sessions | 📈 Analytics | ⚙️ Settings │
└─────────────────────────────────────────────────────────┘
```

### Page Structure
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Dashboard          ⚙️ Settings               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │   🏢 Sites  │ │  🏛️ Venues  │ │ 🎯 Templates │        │
│ │   Active    │ │   Active    │ │   Active     │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🏢 POKER SITES MANAGEMENT                           │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │                                                     │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ + Add New Site                                  │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ PokerStars          Online    [Edit] [Delete]   │ │ │
│ │ │ GGPoker             Online    [Edit] [Delete]   │ │ │
│ │ │ Aria Casino         Live      [Edit] [Delete]   │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎯 TOURNAMENT TEMPLATES                             │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │                                                     │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ + Add New Template                              │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ $33 Big Halula (Tuesday)                        │ │ │
│ │ │ PokerStars • NLHE • $33 • Turbo                │ │ │
│ │ │                           [Edit] [Delete] [Use] │ │ │
│ │ ├─────────────────────────────────────────────────┤ │ │
│ │ │ $109 Sunday Million                             │ │ │
│ │ │ PokerStars • NLHE • $109 • Regular             │ │ │
│ │ │                           [Edit] [Delete] [Use] │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Functionality Specifications

### 1. **Poker Sites Management**
- **Add New Site**: Form with name, type (Online/Live), optional logo URL
- **Edit Site**: Modify existing site details
- **Delete Site**: Remove site (with confirmation if tournaments exist)
- **Site Types**: Online, Live Casino, Home Game

### 2. **Tournament Templates**
- **Template Fields**:
  - Name (e.g., "$33 Big Halula")
  - Site selection
  - Buy-in amount
  - Game type (NLHE, PLO, etc.)
  - Speed (Regular, Turbo, Hyper)
  - Table size
  - Format tags
  - Schedule (optional: "Every Tuesday 8PM")
  - Notes

### 3. **Quick Template Usage**
- **In Session Forms**: Dropdown to select from templates
- **Auto-fill**: Template selection fills all form fields
- **Override**: User can modify template values for specific session

## 🎨 Visual Design Elements

### Color Scheme (Landing Page Theme)
```css
/* Primary Gradients */
.gradient-primary { background: linear-gradient(to right, #3b82f6, #9333ea); }
.gradient-bg { background: linear-gradient(to bottom right, #0f172a, #1e3a8a, #0f172a); }

/* Cards */
.card-dark { background: linear-gradient(to bottom right, #1f2937, #111827); }
.border-dark { border-color: #374151; }

/* Text Colors */
.text-primary { color: #60a5fa; }
.text-accent { color: #a78bfa; }
.text-success { color: #4ade80; }
.text-light { color: #f1f5f9; }
```

### Component Styling
- **Cards**: Dark gradient backgrounds with subtle borders
- **Buttons**: Blue-to-purple gradients with hover effects
- **Forms**: Dark inputs with blue focus rings
- **Icons**: Consistent emoji or icon usage

## 📱 Responsive Design
- **Desktop**: 3-column layout for stats, 2-column for content
- **Tablet**: 2-column stats, single column content
- **Mobile**: Single column throughout, collapsible sections

## 🔄 Integration Points

### 1. **Navigation Updates**
- Add settings gear icon to main navigation
- Settings tab in dashboard navigation

### 2. **Form Integration**
- Tournament creation forms get template dropdown
- Site selection includes custom sites
- Template "Use" button pre-fills session forms

### 3. **Data Management**
- Custom sites stored in database
- Tournament templates with user association
- Validation to prevent deletion of sites/templates in use

## 🚀 Implementation Phases

### Phase 1: Basic Settings Page
1. Create settings page route and component
2. Add navigation gear icon
3. Implement basic layout with sections

### Phase 2: Sites Management
1. Sites CRUD operations
2. Integration with existing site selectors
3. Validation and error handling

### Phase 3: Tournament Templates
1. Template creation and management
2. Integration with tournament forms
3. Quick-use functionality

### Phase 4: Enhanced Features
1. Template scheduling/reminders
2. Import/export settings
3. Advanced customization options

---

**Goal**: Create a powerful, user-friendly settings system that enhances the poker tracking workflow while maintaining the beautiful blue-purple aesthetic of the landing page.