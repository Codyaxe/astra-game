# ✦ Astra — Constellation Tracer

A browser-based motion-tracking constellation tracing game powered by **MediaPipe Hands**, **React**, **Python Flask**, and **MySQL**.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:

1. **[Node.js](https://nodejs.org/)** (v18.0.0 or higher) + **npm**
2. **[Python](https://www.python.org/downloads/)** (v3.10 or higher)
3. **[MySQL Server](https://dev.mysql.com/downloads/mysql/)** or **XAMPP / Laragon** (running on port `3306`)
4. A working **Webcam** (built-in or USB)
5. *(Optional)* **[Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki)** (for webcam student ID scanning)

---

## 🚀 Installation & Running

You need **two terminal windows** (one for the backend, one for the frontend).

### 1. Start the Backend (Flask + MySQL)

Open your first terminal in the root project folder:

```powershell
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask API server
python app.py
```

> 💡 **Backend is running at:** `http://localhost:5000`  
> *(On first start, Flask connects to MySQL, initializes the `constellation_game` database, and seeds constellations automatically).*

---

### 2. Start the Frontend (React + Vite)

Open a second terminal window in the root project folder:

```powershell
# Navigate to frontend folder
cd frontend

# Install npm dependencies (first time only)
npm install

# Start the Vite development server
npm run dev
```

> 🎮 **Game is running at:** `http://localhost:5173`

---

## 📱 Mobile Local Wi-Fi Testing (QR Fallback)

To test the mobile registration flow from your phone on the same local Wi-Fi router:

1. In the frontend terminal, start with the `--host` flag:
   ```powershell
   npm run dev -- --host
   ```
2. Find your computer's local IP address (run `ipconfig` in terminal, e.g. `192.168.1.100`).
3. Open your mobile browser and go to:
   👉 **`http://<YOUR_LOCAL_IP>:5173/?mode=mobile`**

---

## 📦 Production Build

```powershell
# Build static React bundle
cd frontend
npm run build

# Preview production build locally
npm run preview
```

---

## 🎮 Wand Gestures Cheat-Sheet

| Gesture | Movement | In-Game Action |
|---|---|---|
| **Forward Tilt** | Tilt wand/index finger tip toward camera | Sets `ON_HOLD` / `ON_DRAW = true` (draws dynamic line) |
| **Untilt (Neutral)** | Return wand to upright/neutral position | Completes **1 click**, verifies & locks star link |
| **Left / Right Tilt** | Rapid roll/tilt sideways | Clears all current lines (Reset attempt) |
| **Circle Motion** | Full 360° circular sweep | Emergency Force Exit to Leaderboard |
| **Up / Down Shake** | Rapid up-and-down shaking | Recalibrates wand baseline tracking |

---

## 🌌 Adding or Modifying Constellations

Constellations are stored in MySQL using a Linked List structure. To add or adjust constellations:

### 1. Edit `backend/database/seed.py`
Append your constellation dictionary to the `CONSTELLATIONS` list:

```python
{
    "name": "Pegasus",
    "head_node_id": 0,
    "time_limit_sec": 90,
    "star_nodes": [
        {"id": 0, "label": "Markab",    "x": 0.35, "y": 0.30, "next_node_id": 1,    "hitbox_radius": 0.055},
        {"id": 1, "label": "Scheat",    "x": 0.32, "y": 0.55, "next_node_id": 2,    "hitbox_radius": 0.055},
        {"id": 2, "label": "Alpheratz", "x": 0.60, "y": 0.58, "next_node_id": 3,    "hitbox_radius": 0.055},
        {"id": 3, "label": "Algenib",   "x": 0.62, "y": 0.32, "next_node_id": null, "hitbox_radius": 0.055},
    ],
    "fake_nodes": [
        # IDs for decoy/fake stars must be >= 100
        {"id": 100, "x": 0.22, "y": 0.40, "hitbox_radius": 0.045},
        {"id": 101, "x": 0.70, "y": 0.45, "hitbox_radius": 0.045},
    ]
}
```

> **Guidelines:**
> - `x` and `y` are normalized ratios from `0.1` to `0.9` (matching cockpit screen space).
> - `next_node_id`: ID of the next connecting star (`null` for the terminal star).
> - `fake_nodes` (decoy stars): Must have IDs $\ge 100$.

### 2. Run the Seed Command
In your backend terminal, execute:
```powershell
python -c "from database.seed import seed; seed()"
```

The new constellation will automatically be loaded into MySQL, included in the randomized session playlists, and made instantly testable in the **Admin Dashboard > Constellation Lab** tab.

---

## 🔒 Security

Please **change** the Flask Secret Key when online deployment is considered.