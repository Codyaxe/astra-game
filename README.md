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
