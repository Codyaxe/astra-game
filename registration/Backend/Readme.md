# BSU Mobile Registration System

A mobile-friendly registration form for event sign-ups at Batangas State
University. Students scan their university ID with their phone camera; the
backend reads the name, SR-code, and program off the ID automatically using
OCR, and infers the department from the program name.

- **Frontend**: React (Vite), accessed from a phone over the local WiFi network
- **Backend**: Python Flask, does OCR (EasyOCR) and stores registrations in
  a MariaDB/MySQL database

---

## 1. What to install first

You need all of these installed on the laptop that will host the app
(the phone doesn't need anything installed — it just opens a browser).

| Tool | Notes |
|---|---|
| [Node.js](https://nodejs.org/) | Any recent LTS version. Comes with `npm`. |
| [Python 3.10+](https://www.python.org/) | Make sure "Add to PATH" is checked during install. |
| [XAMPP](https://www.apachefriends.org/) | Gives you MariaDB (a MySQL-compatible database) and phpMyAdmin. |

---

## 2. Project structure

```
Mobile Registration Form/
├── Backend/
│   ├── app.py              <- Flask server (OCR + database)
│   └── requirements.txt
└── src/
    ├── App.jsx
    ├── main.jsx
    └── RegisterForm.jsx    <- the registration form UI
```

---

## 3. One-time setup

### 3a. Database (MariaDB via XAMPP)

1. Open the **XAMPP Control Panel** and click **Start** next to **MySQL**.
2. Open **phpMyAdmin** (Admin button next to MySQL, or `localhost/phpmyadmin`).
3. Go to the **SQL** tab and run:
   ```sql
   CREATE DATABASE bsu_registration;
   ```
   You only need to do this once. The `registrations` table inside it gets
   created automatically the first time the backend runs.

### 3b. Backend (Python)

Open a terminal in the `Backend` folder:

```
pip install -r requirements.txt
```

This installs Flask, EasyOCR, and the MySQL driver. **Note:** EasyOCR pulls
in PyTorch as a dependency, which is a fairly large download (a few hundred
MB) — this can take a few minutes on a slow connection.

Then open `app.py` and check the `DB_CONFIG` block near the top matches
your MariaDB setup:

```python
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",          # default XAMPP root has no password
    "database": "bsu_registration",
}
```

If you set a MySQL root password, put it here.

### 3c. Frontend (React)

Open a terminal in the project root (where `package.json` is):

```
npm install
```

---

## 4. Running it

You need **two terminals running at the same time** — one for the backend,
one for the frontend.

**Terminal 1 — backend:**
```
cd Backend
python app.py
```
First startup takes a few extra seconds while EasyOCR loads its model (and,
the very first time ever, downloads it — needs internet just that once).
You should see Flask running on `0.0.0.0:5000` with no errors.

**Terminal 2 — frontend:**
```
npm run dev -- --host
```
The `--host` flag is required — without it, only the laptop itself can open
the page, not the phone. This prints two URLs; ignore the `Local` one and
use the **Network** one (looks like `http://192.168.x.x:5173`).

---

## 5. Opening it on a phone

1. Make sure the phone and the laptop are connected to the **same WiFi
   network** (not a "Guest" network — some routers isolate guest devices
   from each other, which would break this).
2. On the phone's browser, go to the **Network URL** printed by the Vite
   terminal in step 4 (e.g. `http://192.168.1.34:5173`).
3. The form loads. It talks to the Flask backend automatically using
   whatever IP the phone is already connected through.

If the phone can't reach it: check Windows Firewall didn't block the
connection (it usually pops up an Allow prompt the first time), and confirm
both devices show the same WiFi network name.

---

## 6. Viewing stored registrations

Open phpMyAdmin (`localhost/phpmyadmin`) → `bsu_registration` →
`registrations` → **Browse** tab. Every confirmed registration appears as a
row there.

---

## 7. How the OCR/department logic works (for future reference)

- The backend detects the course line on the ID by looking for text that
  starts with "BS" — this makes it work for **any** BSU program, not just a
  hardcoded list.
- The two lines directly above the course line are read as the last name
  and the first-name-plus-middle-initial line — this is anchored on the
  course line's position, not on any name lookup, so it works for any
  student.
- Department is derived from the program name (not printed on the ID):
  - Program contains "Information Technology" or "Computer Science" → **CICS**
  - Program contains "Engineering" **and** "Technology" → **CET**
  - Program contains "Engineering" (no "Technology") → **COE**
  - Anything else → **CAFAD**

If a scan comes back wrong, check the terminal running `app.py` — every
scan prints a debug block showing exactly which lines were detected and
which one it picked as the course anchor.

---

## 8. Common errors

| Error | Fix |
|---|---|
| `Access denied for user 'root'@'localhost'` | Password in `DB_CONFIG` doesn't match your MariaDB root password. |
| `Unknown database 'bsu_registration'` | The `CREATE DATABASE` step (3a) wasn't run, or MariaDB isn't running. |
| `Can't connect to MySQL server` | MariaDB isn't running — check it's green in the XAMPP Control Panel. |
| Phone can't open the Network URL | Confirm same WiFi network, check firewall didn't block the port, make sure `--host` was used when starting the frontend. |
| Form looks fine on laptop but overflows/scrolls on phone | Should auto-fit — if not, hard-refresh the phone browser (the page measures and scales itself to the screen on load). |