# Poker Session Tracker - Quick Actions API Documentation

## Overview

This document describes the new quick action API endpoints added to the poker session tracker to enable fast tournament management during live play.

## Authentication

All endpoints require authentication via Token header:
```
Authorization: Token <your-token>
```

## Tournament Quick Actions

### Add Rebuy
**Endpoint:** `POST /api/tournaments/{id}/rebuy/`

**Description:** Increments the rebuy count for an active tournament.

**Parameters:**
- `id` (path): Tournament ID

**Request Body:** Empty `{}`

**Response:**
```json
{
  "rebuys": 2,
  "message": "Rebuy added",
  "tournament_id": 123
}
```

**Error Responses:**
- `400 Bad Request`: Tournament is already finished
- `404 Not Found`: Tournament doesn't exist or doesn't belong to user

**Example Usage:**
```javascript
import { tournamentRebuy } from '@/lib/api';

const response = await tournamentRebuy(123);
console.log(`Tournament now has ${response.rebuys} rebuys`);
```

---

### Add Bounty
**Endpoint:** `POST /api/tournaments/{id}/add_bounty/`

**Description:** Adds a bounty amount won for PKO (Progressive Knockout) tournaments.

**Parameters:**
- `id` (path): Tournament ID

**Request Body:**
```json
{
  "bounty_amount": 87.50
}
```

**Response:**
```json
{
  "bounties_won": 87.50,
  "message": "Bounty of $87.5 added",
  "tournament_id": 123
}
```

**Error Responses:**
- `400 Bad Request`: Tournament is already finished, or invalid bounty amount
- `404 Not Found`: Tournament doesn't exist or doesn't belong to user

**Example Usage:**
```javascript
import { tournamentAddBounty } from '@/lib/api';

const response = await tournamentAddBounty(123, 87.50);
console.log(`Tournament bounties now total: $${response.bounties_won}`);
```

---

### Bust Tournament
**Endpoint:** `POST /api/tournaments/{id}/bust/`

**Description:** Marks a tournament as busted (sets end_time to now, prize_won to 0, but preserves bounties_won).

**Parameters:**
- `id` (path): Tournament ID

**Request Body:** Empty `{}`

**Response:**
```json
{
  "message": "Tournament marked as busted (kept $87.5 in bounties)",
  "tournament_id": 123,
  "end_time": "2025-08-13T16:30:00Z",
  "bounties_won": 87.50
}
```

**Important**: When you bust out of a PKO tournament, you keep any bounties you've already won. Only the main tournament prize is set to 0.

**Error Responses:**
- `400 Bad Request`: Tournament is already finished
- `404 Not Found`: Tournament doesn't exist or doesn't belong to user

**Example Usage:**
```javascript
import { tournamentBust } from '@/lib/api';

const response = await tournamentBust(123);
console.log('Tournament busted at:', response.end_time);
if (response.bounties_won > 0) {
  console.log(`Kept $${response.bounties_won} in bounties`);
}
```

---

### Finish Tournament
**Endpoint:** `POST /api/tournaments/{id}/finish/`

**Description:** Marks a tournament as finished with a prize amount.

**Parameters:**
- `id` (path): Tournament ID

**Request Body:**
```json
{
  "prize_won": 450.00
}
```

**Response:**
```json
{
  "message": "Tournament finished with $450.0",
  "tournament_id": 123,
  "prize_won": 450.00,
  "end_time": "2025-08-13T16:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Tournament is already finished, or invalid prize amount
- `404 Not Found`: Tournament doesn't exist or doesn't belong to user

**Example Usage:**
```javascript
import { tournamentFinish } from '@/lib/api';

const response = await tournamentFinish(123, 450.00);
console.log(`Tournament finished with $${response.prize_won}`);
```

## Session Quick Actions

### Quick Add Tournament
**Endpoint:** `POST /api/sessions/{id}/quick_tournament/`

**Description:** Quickly adds a tournament to a session with minimal required fields.

**Parameters:**
- `id` (path): Session ID

**Request Body:**
```json
{
  "name": "$33 Monster Stack",
  "site": 1,
  "buy_in": 33.00,
  "notes": "Optional notes",
  "type": "MTT",
  "game": "NLHE",
  "speed": "regular",
  "table_size": "8max"
}
```

**Required Fields:**
- `name`: Tournament name
- `site`: Site ID
- `buy_in`: Buy-in amount

**Optional Fields:**
- `notes`: Tournament notes
- `type`: Tournament type (default: "MTT")
- `game`: Game type (default: "NLHE")
- `speed`: Tournament speed (default: "regular")
- `table_size`: Table size (default: "8max")

**Response:**
```json
{
  "message": "Tournament added to session",
  "tournament": {
    "id": 124,
    "name": "$33 Monster Stack",
    "site": 1,
    "buy_in": 33.00,
    "prize_won": 0.00,
    "bounties_won": 0.00,
    "entries_used": 1,
    "rebuys": 0,
    "addons": 0,
    "start_time": "2025-08-13T16:30:00Z",
    "end_time": null,
    "format_tags": []
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid data
- `404 Not Found`: Session doesn't exist or doesn't belong to user

**Example Usage:**
```javascript
import { sessionQuickTournament } from '@/lib/api';

const response = await sessionQuickTournament(456, {
  name: "$109 Sunday Special",
  site: 2,
  buy_in: 109.00
});
console.log('Added tournament:', response.tournament.name);
```

---

### Get Active Tournaments
**Endpoint:** `GET /api/sessions/{id}/active_tournaments/`

**Description:** Returns only active tournaments (no end_time) for a session.

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
[
  {
    "id": 124,
    "name": "$33 Monster Stack",
    "site": 1,
    "buy_in": 33.00,
    "prize_won": 0.00,
    "bounties_won": 87.50,
    "entries_used": 1,
    "rebuys": 1,
    "addons": 0,
    "start_time": "2025-08-13T16:30:00Z",
    "end_time": null,
    "format_tags": [1, 3]
  }
]
```

**Example Usage:**
```javascript
import { getActiveTournaments } from '@/lib/api';

const activeTournaments = await getActiveTournaments(456);
console.log(`${activeTournaments.length} tournaments still active`);
```

---

### Get Completed Tournaments
**Endpoint:** `GET /api/sessions/{id}/completed_tournaments/`

**Description:** Returns only completed tournaments (has end_time) for a session.

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
[
  {
    "id": 123,
    "name": "$22 Turbo",
    "site": 1,
    "buy_in": 22.00,
    "prize_won": 0.00,
    "entries_used": 1,
    "rebuys": 0,
    "addons": 0,
    "start_time": "2025-08-13T15:00:00Z",
    "end_time": "2025-08-13T16:15:00Z",
    "format_tags": [2]
  }
]
```

**Example Usage:**
```javascript
import { getCompletedTournaments } from '@/lib/api';

const completedTournaments = await getCompletedTournaments(456);
console.log(`${completedTournaments.length} tournaments completed`);
```

## Security Features

### User Scoping
All tournament endpoints now properly scope to the authenticated user:
- Users can only access tournaments from their own sessions
- Prevents unauthorized access to other users' data

### Validation
- Tournament actions validate that tournaments are still active
- Prize amounts must be non-negative numbers
- Buy-in amounts must be positive numbers
- Required fields are validated on tournament creation

## Frontend Integration

### Quick Action Buttons
The session detail page now includes quick action buttons for active tournaments:
- **+Rebuy**: Blue button to add rebuys
- **+Addon**: Purple button to add addons  
- **Bust**: Red button to mark as busted
- **Finish**: Green button to finish with prize

### Visual Indicators
- Active tournaments have green border and "ACTIVE" badge
- Completed tournaments show finish time
- Quick actions only appear for active tournaments

### Error Handling
All API calls include proper error handling with user-friendly messages displayed in the UI.

## Common Use Cases

### During Live Play
1. **Starting a session**: Create session, then use quick_tournament to add first tournament
2. **Adding rebuys**: Click +Rebuy button or call `/tournaments/{id}/rebuy/`
3. **Busting out**: Click Bust button or call `/tournaments/{id}/bust/`
4. **Cashing**: Click Finish button, enter prize amount

### Session Management
1. **View active tournaments**: Use `/sessions/{id}/active_tournaments/`
2. **Review completed tournaments**: Use `/sessions/{id}/completed_tournaments/`
3. **Quick tournament entry**: Use quick_tournament endpoint for fast entry

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid data or tournament already finished |
| 401 | Unauthorized - Invalid or missing token |
| 404 | Not Found - Tournament/session doesn't exist or doesn't belong to user |
| 500 | Internal Server Error - Server-side error |

## Rate Limiting

No specific rate limiting is implemented, but reasonable usage is expected. Avoid rapid-fire requests.

## Future Enhancements

Potential future additions:
- Bulk tournament operations
- Tournament templates for common games
- Auto-rebuy settings
- Push notifications for tournament updates
- Statistics and analytics endpoints