# Astra Leaderboard — UI Redesign

## Overview

Redesigned the leaderboard screen with a modern gaming aesthetic: podium for top 3, stats bar, search, and pagination.

---

## What Changed

### Files Modified

| File | Changes |
|------|---------|
| `src/screens/LeaderboardScreen.jsx` | Full redesign — podium, stats bar, search, pagination |
| `src/index.css` | All new leaderboard CSS (+666 lines) |
| `src/components/LeaderboardTable.jsx` | Fixed field names to match backend response |
| `src/services/api.js` | Port fix: `5000` → `5005` |
| `vite.config.js` | Port fix: `5000` → `5005` |
| `../backend/requirements.txt` | Added `mysql-connector-python` |
| `../backend/database/seed_test_players.py` | **New** — 30 test players for UI testing |

### New UI Features

1. **Header** — Gold gradient title with trophy icon
2. **Player Summary Card** — Shows current player's name, SR-code, course, attempt progress bar, best score, and QR ticket
3. **Stats Bar** — Three cards: Total Participants, Your Rank, Your Best Score
4. **Podium (Top 3)** — Gold/silver/bronze cards with crown animation for 1st place, platform bases underneath
5. **Search** — Filter table by name, SR-code, or course
6. **Table (Ranks 4+)** — Score bars, hover effects, "You" badge on current player
7. **Pagination** — 5 rows per page with prev/next buttons and page numbers

### No Backend API Changes

All existing endpoints and data shapes are preserved:
- `GET /api/leaderboard/?limit=50` — returns `{ leaderboard: [...] }`
- `GET /api/auth/ticket-qr/<player_id>` — returns QR image
- Props: `{ player, lastAttemptResult, onRetry, onReturnToTitle }`

### LeaderboardTable.jsx Fix

Fixed field name mismatch with backend response:
- `entry.full_name` → `entry.first_name` + `entry.last_name`
- `entry.total_score` → `entry.highest_score`

---

## Seed Data (Test Players)

### What is it?

`backend/database/seed_test_players.py` inserts 30 fake players with random names, courses, and scores into the database. This is **only for UI testing** — it does not affect real gameplay.

### How to run it

```bash
cd backend
python3 -m database.seed_test_players
```

This will insert 30 players with scores ranging from 15–98 into the `players` and `leaderboard` tables.

### How to remove it

Your teammates can clean up test data with these SQL queries:

```sql
-- Remove test leaderboard entries
DELETE FROM leaderboard
WHERE player_id IN (
    SELECT id FROM players WHERE qr_ticket_code LIKE 'ASTRA-TEST-%'
);

-- Remove test players
DELETE FROM players
WHERE qr_ticket_code LIKE 'ASTRA-TEST-%';
```

All test players have `qr_ticket_code` starting with `ASTRA-TEST-` so they're easy to identify and remove.

### Do I need to run it?

**No.** The leaderboard works with real data from actual gameplay. The seed script is optional — only run it if you want to see the UI with 30+ rows for testing layout, pagination, and search.

---

## How to Test

### 1. Start the servers

```bash
# Terminal 1 — Backend
cd backend
python3 -m flask --app app run --host 0.0.0.0 --port 5005 --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

### 2. Open the app

Go to `http://localhost:5175/` in your browser.

### 3. Test the leaderboard

- **Without seed data:** Register a player, play a game, submit a score. The leaderboard will show real data.
- **With seed data:** Run `python3 -m database.seed_test_players` in the backend folder first, then navigate to the leaderboard.

### 4. Check these features

| Feature | What to verify |
|---------|---------------|
| Podium | Top 3 players shown with gold/silver/bronze cards |
| Stats bar | Total Participants count, Your Rank, Your Best Score |
| Table | Ranks #4+ shown, 5 rows per page |
| Pagination | Click page numbers or Prev/Next to navigate |
| Search | Type a name or SR-code to filter results |
| "You" badge | Current player highlighted in podium or table |
| Responsive | Resize browser to < 600px — podium stacks vertically |

---

## Tech Stack

- React (Vite)
- CSS custom properties + glassmorphism
- Backend: Flask + MySQL (unchanged)
