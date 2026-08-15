# Astra Game — Backend API Documentation

## Base URL

http://localhost:5000

---

# Authentication / Player API

## 1. Register Player

POST `/api/auth/register`

Registers a new player.

### Request Body

```json
{
  "first_name": "Test",
  "last_name": "Player",
  "sr_code": "TEST001",
  "course": "CpE",
  "contact_number": "09171234567"
}
```

### Required Fields
  - first_name
  - last_name
  - sr_code
  - course
  - contact_number is for consolation prize.

### New Player Response
  - Status: 201 Created

### Existing Player (If the sr_code is already registered:)
   - Status: 200 OK

### Missing Required Fields
   - Status: 400 Bad Request

### Registration Conflict
   - Status: 409 Conflict

## 2. Mobile Registration
POST `/api/auth/mobile-register`

Fallback registration endpoint for registration through a mobile device.

## 3. Mobile Registration
POST `/api/auth/mobile-register`

