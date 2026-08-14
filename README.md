# ✦ Astra Frontend (React + Vite)

Frontend client for the Astra Constellation-Tracing game, featuring MediaPipe webcam wand motion tracking and interactive canvas rendering.

---

## 📋 Prerequisites

- **[Node.js](https://nodejs.org/)** (v18.0.0 or higher)
- **npm** (comes with Node.js)
- A working **Webcam**
- Backend running on `http://localhost:5000` (see `backend/` instructions)

---

## 🚀 Installation & Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will be running at:
👉 **`http://localhost:5173`**

---

## 📱 Mobile Local Wi-Fi Testing (QR Fallback)

To test the mobile registration flow from your phone on the same local Wi-Fi:

```bash
npm run dev -- --host
```

Open on phone browser:
👉 **`http://<YOUR_LOCAL_IP>:5173/?mode=mobile`**

---

## 📦 Production Build

```bash
# Build static bundle
npm run build

# Preview production build locally
npm run preview
```
