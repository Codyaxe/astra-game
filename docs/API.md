# Astra Constellation Game — Official Backend API Specification

## Base URL
```
http://localhost:5000/api
```

---

## 1. Authentication & Registration

### `POST /auth/register`
Registers a new player at the kiosk.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "sr_code": "23-01234",
  "course": "BS Computer Science",
  "contact_number": "09171234567"
}
```

**Response (201 Created / 200 OK):**
```json
{
  "player": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "sr_code": "23-01234",
    "course": "BS Computer Science",
    "contact_number": "09171234567",
    "qr_ticket_code": "ASTRA-2301234-A1B2C3",
    "total_attempts_used": 0,
    "best_score": 0.0
  },
  "is_existing": false,
  "qr_ticket_code": "ASTRA-2301234-A1B2C3"
}
```

---

### `POST /auth/mobile-register`
Mobile web registration fallback (`/?mode=mobile`).

---

## 2. Gameplay & Sessions

### `POST /game/start`
Starts a new challenge session for a player (max 3 attempts per player).

**Request Body:**
```json
{
  "player_id": 1,
  "constellation_id": 1
}
```

**Response (201 Created):**
```json
{
  "session_id": 1,
  "player_id": 1,
  "attempt_number": 1,
  "attempts_used": 0,
  "attempts_remaining": 2,
  "can_play": true
}
```

---

### `POST /game/validate-step`
Validates whether connecting from `from_node_id` to `to_node_id` matches the linked-list sequence.

**Request Body:**
```json
{
  "constellation_id": 1,
  "from_node_id": 0,
  "to_node_id": 1
}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "from_node_id": 0,
  "to_node_id": 1
}
```

---

### `POST /game/submit`
Submits attempt telemetry upon constellation completion or timer expiration.

**Request Body:**
```json
{
  "session_id": 1,
  "player_id": 1,
  "time_elapsed_ms": 4200,
  "wrong_connections": 0,
  "total_clicks": 3,
  "wand_travel_dist": 450.5,
  "completed_status": 1,
  "time_limit_sec": 30
}
```

**Status Codes for `completed_status`:**
- `1` = Completed
- `2` = Disqualified (Timer Expired)
- `3` = Force Exited

**Response (200 OK):**
```json
{
  "session_id": 1,
  "player_id": 1,
  "score": 94.85,
  "attempt_score": 94.85,
  "best_score": 94.85,
  "attempts_used": 1,
  "attempts_remaining": 2,
  "completed_status": 1
}
```

---

## 3. Leaderboards

### `GET /leaderboard/?limit=50`
Returns top players sorted by `best_score DESC`.

**Response (200 OK):**
```json
{
  "leaderboard": [
    {
      "player_id": 1,
      "first_name": "Aether",
      "last_name": "Valerius",
      "sr_code": "23-00101",
      "course": "BS Computer Science",
      "highest_score": 98.6,
      "best_score": 98.6,
      "attempts_used": 2,
      "qr_ticket_code": "ASTRA-2300101"
    }
  ]
}
```
