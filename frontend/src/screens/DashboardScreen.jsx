import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, Trash2, RotateCcw, QrCode, RefreshCw, X, Play, Sliders, Activity, Video, MousePointer, Sparkles } from "lucide-react";
import { useWandGestures } from "../hooks/useWandGestures";
import { getMagneticSnap } from "../game/snapping";
import { playSfx } from "../utils/audio";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

const colors = {
  bg: "#030712",
  cardBg: "rgba(11, 15, 28, 0.85)",
  inputBg: "rgba(15, 23, 42, 0.65)",
  inputBorder: "rgba(255, 255, 255, 0.08)",
  accent: "#6366f1",
  accentGlow: "rgba(99, 102, 241, 0.35)",
  gold: "#f4d58d",
  star: "#fef08a",
  text: "#f8fafc",
  textDim: "#64748b",
  iconPurple: "#818cf8",
  success: "#4ade80",
  danger: "#f87171",
  cyan: "#38bdf8",
};

function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 50 }).map(() => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.6 + 0.3,
        delay: Math.random() * 3,
      })),
    []
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: colors.star,
            opacity: s.opacity,
            animation: `twinkle 3s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function Dashboard({
  onBack,
  onLaunchChallenge,
  constellations = [],
  gameSettings = { controlMode: 'hybrid', showCamPip: false },
  onUpdateSettings = () => {},
}) {
  const [activeTab, setActiveTab] = useState("lab"); // "database" | "lab"
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);

  // Motion Capture Lab State
  const labControlMode = gameSettings.controlMode || 'hybrid';
  const setLabControlMode = (mode) => onUpdateSettings({ controlMode: mode });
  const [selectedConstellationIdx, setSelectedConstellationIdx] = useState(0);
  const [labConnections, setLabConnections] = useState([]);
  const [labDrawingFrom, setLabDrawingFrom] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Practice Star Nodes on Lab Canvas
  const testStars = useMemo(() => [
    { id: 1, label: "Star Alpha", x: 0.25, y: 0.3, screenX: 0.25, screenY: 0.3 },
    { id: 2, label: "Star Beta", x: 0.75, y: 0.28, screenX: 0.75, screenY: 0.28 },
    { id: 3, label: "Star Gamma", x: 0.8, y: 0.75, screenX: 0.8, screenY: 0.75 },
    { id: 4, label: "Star Delta", x: 0.28, y: 0.72, screenX: 0.28, screenY: 0.72 },
  ], []);

  // Motion Capture Wand Hook
  const { videoRef, pointer, onDraw, gestureStatus, isReady } = useWandGestures({
    enabled: activeTab === "lab",
    onConnectionCycleComplete: () => {
      console.log("[LAB] 🎯 Wand Cycle Complete Detected!");
      playSfx("snap");
    },
  });

  const activePointer =
    labControlMode === "mouse" ? { ...mousePos, isDrawing: isMouseDown }
    : labControlMode === "wand" ? pointer
    : (isMouseDown ? { ...mousePos, isDrawing: true } : pointer);

  const snapped = useMemo(() => {
    if (!activePointer) return null;
    return getMagneticSnap(activePointer, testStars);
  }, [activePointer, testStars]);

  useEffect(() => {
    if (activeTab === "database") {
      fetchRegistrations();
    }
  }, [activeTab]);

  async function fetchRegistrations() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/registrations`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setRegistrations(data);
    } catch (err) {
      setError("Failed to load registrations. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(id) {
    if (!window.confirm("Are you sure you want to reset attempts back to 0 for this player?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/registrations/${id}/reset`, { method: "POST" });
      if (!res.ok) throw new Error();
      fetchRegistrations();
    } catch (err) {
      alert("Failed to reset attempts.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this registration? This cannot be undone.")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/registrations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchRegistrations();
    } catch (err) {
      alert("Failed to delete record.");
    }
  }

  const handleLabCanvasMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: nx, y: ny });
    setIsMouseDown(true);

    const hit = testStars.find((s) => {
      const dx = s.x - nx;
      const dy = s.y - ny;
      return Math.sqrt(dx * dx + dy * dy) < 0.1;
    });
    if (hit) setLabDrawingFrom(hit);
  };

  const handleLabCanvasMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: nx, y: ny });
  };

  const handleLabCanvasMouseUp = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setIsMouseDown(false);

    if (labDrawingFrom) {
      const hit = testStars.find((s) => {
        const dx = s.x - nx;
        const dy = s.y - ny;
        return Math.sqrt(dx * dx + dy * dy) < 0.1 && s.id !== labDrawingFrom.id;
      });
      if (hit) {
        setLabConnections((prev) => [...prev, { from: labDrawingFrom, to: hit }]);
        playSfx("snap");
      }
    }
    setLabDrawingFrom(null);
  };

  const filtered = registrations.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.first_name?.toLowerCase().includes(term) ||
      r.last_name?.toLowerCase().includes(term) ||
      r.sr_code?.toLowerCase().includes(term) ||
      (r.course && r.course.toLowerCase().includes(term)) ||
      (r.section && r.section.toLowerCase().includes(term))
    );
  });

  return (
    <div
      style={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        background: colors.bg,
        fontFamily: "'Outfit', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 0 40px",
        overflowX: "hidden",
        overflowY: "auto",
        boxSizing: "border-box",
        zIndex: 20,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0.25} 50%{opacity:1} }
        .action-btn { transition: all 0.2s ease; cursor: pointer; }
        .action-btn:hover { transform: scale(1.08); }
        .action-btn:active { transform: scale(0.95); }
        .table-row { transition: background-color 0.2s; }
        .table-row:hover { background: rgba(255, 255, 255, 0.03) !important; }
      `}</style>

      <Starfield />

      {/* Top Bar Header */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 1040,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(15,23,42,0.8)",
            border: `1px solid ${colors.inputBorder}`,
            color: colors.textDim,
            borderRadius: 12,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: 0.5,
          }}
        >
          ← TITLE SCREEN
        </button>

        {/* Tab Switcher Pills */}
        <div
          style={{
            display: "flex",
            background: "rgba(15,23,42,0.9)",
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 30,
            padding: 4,
            gap: 4,
          }}
        >
          <button
            onClick={() => setActiveTab("lab")}
            style={{
              background: activeTab === "lab" ? colors.accent : "transparent",
              color: activeTab === "lab" ? "#fff" : colors.textDim,
              border: "none",
              borderRadius: 20,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
          >
            <Sliders size={14} /> MOTION & MOUSE LAB
          </button>
          <button
            onClick={() => setActiveTab("database")}
            style={{
              background: activeTab === "database" ? colors.accent : "transparent",
              color: activeTab === "database" ? "#fff" : colors.textDim,
              border: "none",
              borderRadius: 20,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
          >
            <QrCode size={14} /> PLAYER DATABASE ({registrations.length})
          </button>
        </div>

        {onLaunchChallenge ? (
          <button
            onClick={() => onLaunchChallenge(selectedConstellationIdx)}
            style={{
              background: "linear-gradient(135deg, #4ade80, #22d3ee)",
              border: "none",
              color: "#050916",
              borderRadius: 12,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(74,222,128,0.4)",
            }}
          >
            <Play size={13} fill="#050916" /> LAUNCH GAME
          </button>
        ) : (
          <div style={{ width: 120 }} />
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MOTION CAPTURE & MOUSE LAB                                         */}
      {/* ========================================================================= */}
      {activeTab === "lab" && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: 1040,
            padding: "0 18px",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 18,
          }}
        >
          {/* LEFT: Live Testing Ground Canvas */}
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: 20,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: colors.cyan, letterSpacing: 1 }}>
                  INTERACTIVE PLAYGROUND
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>
                  Star Snapping & Tracing Sandbox
                </div>
              </div>
              <button
                onClick={() => setLabConnections([])}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.textDim,
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear Lines
              </button>
            </div>

            {/* Live Interactive SVG Canvas */}
            <div
              onMouseDown={handleLabCanvasMouseDown}
              onMouseMove={handleLabCanvasMouseMove}
              onMouseUp={handleLabCanvasMouseUp}
              style={{
                position: "relative",
                width: "100%",
                height: 380,
                background: "radial-gradient(circle at center, #0b1124 0%, #030712 100%)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                borderRadius: 16,
                overflow: "hidden",
                cursor: "crosshair",
              }}
            >
              <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                {/* Drawn Connections */}
                {labConnections.map((c, i) => (
                  <line
                    key={i}
                    x1={`${c.from.x * 100}%`}
                    y1={`${c.from.y * 100}%`}
                    x2={`${c.to.x * 100}%`}
                    y2={`${c.to.y * 100}%`}
                    stroke="#f4d58d"
                    strokeWidth="3"
                    filter="drop-shadow(0 0 6px rgba(244,213,141,0.8))"
                  />
                ))}

                {/* Active Live Drag Line */}
                {labDrawingFrom && (
                  <line
                    x1={`${labDrawingFrom.x * 100}%`}
                    y1={`${labDrawingFrom.y * 100}%`}
                    x2={`${mousePos.x * 100}%`}
                    y2={`${mousePos.y * 100}%`}
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                )}
              </svg>

              {/* Star Nodes */}
              {testStars.map((star) => {
                const isSnappedTarget = snapped?.node?.id === star.id;
                return (
                  <div
                    key={star.id}
                    style={{
                      position: "absolute",
                      left: `${star.x * 100}%`,
                      top: `${star.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        width: isSnappedTarget ? 34 : 24,
                        height: isSnappedTarget ? 34 : 24,
                        borderRadius: "50%",
                        background: isSnappedTarget ? "#f4d58d" : "#818cf8",
                        boxShadow: isSnappedTarget
                          ? "0 0 20px #f4d58d, 0 0 35px rgba(244,213,141,0.6)"
                          : "0 0 12px rgba(129,140,248,0.5)",
                        transition: "all 0.2s ease",
                        border: "2px solid #fff",
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 700, color: colors.textDim, marginTop: 4 }}>
                      {star.label}
                    </span>
                  </div>
                );
              })}

              {/* Reticle Cursor for Active Pointer */}
              {activePointer && (
                <div
                  style={{
                    position: "absolute",
                    left: `${activePointer.x * 100}%`,
                    top: `${activePointer.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: 28,
                    height: 28,
                    border: `2px solid ${activePointer.isDrawing ? "#4ade80" : "#38bdf8"}`,
                    borderRadius: "50%",
                    pointerEvents: "none",
                    boxShadow: `0 0 16px ${activePointer.isDrawing ? "#4ade80" : "#38bdf8"}`,
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ position: "absolute", inset: 8, background: activePointer.isDrawing ? "#4ade80" : "#38bdf8", borderRadius: "50%" }} />
                </div>
              )}
            </div>

            {/* Input Mode & Settings Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "rgba(15,23,42,0.6)", padding: "12px 14px", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>Global Input Control:</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { id: "mouse", label: "🖱️ Mouse / Touch" },
                    { id: "wand", label: "🪄 Motion Wand" },
                    { id: "hybrid", label: "⚡ Hybrid Both" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setLabControlMode(m.id)}
                      style={{
                        background: labControlMode === m.id ? colors.accent : "rgba(255,255,255,0.06)",
                        color: labControlMode === m.id ? "#fff" : colors.textDim,
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Level Tier Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>Game Difficulty Tier:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { id: "easy", label: "🟢 Easy", color: "#4ade80", bg: "rgba(74, 222, 128, 0.2)" },
                      { id: "medium", label: "🟡 Medium", color: "#facc15", bg: "rgba(250, 204, 21, 0.2)" },
                      { id: "hard", label: "🔴 Hard", color: "#f87171", bg: "rgba(248, 113, 113, 0.2)" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => onUpdateSettings({ difficulty: d.id })}
                        style={{
                          background: (gameSettings.difficulty || "easy") === d.id ? d.bg : "rgba(255,255,255,0.06)",
                          color: (gameSettings.difficulty || "easy") === d.id ? d.color : colors.textDim,
                          border: (gameSettings.difficulty || "easy") === d.id ? `1px solid ${d.color}` : "1px solid transparent",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Rules Description Summary */}
                <div style={{ fontSize: 11, color: colors.textDim, background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: 8, marginTop: 4 }}>
                  {(gameSettings.difficulty || "easy") === "easy" && (
                    <span>🟢 <b>Easy (Cadet)</b>: Tracing Guide Lines ON · White Dwarfs Visible · Star Names Visible · 30s Timer</span>
                  )}
                  {(gameSettings.difficulty || "easy") === "medium" && (
                    <span>🟡 <b>Medium (Officer)</b>: Tracing Guides Hidden · Star Names Hidden · Normal Star Decoys · 30s Timer</span>
                  )}
                  {(gameSettings.difficulty || "easy") === "hard" && (
                    <span>🔴 <b>Hard (Commander)</b>: Tracing Guides Hidden · Star Names Hidden · Normal Star Decoys · ⚡ <b>15s Timer (Halfed)</b></span>
                  )}
                </div>
              </div>

              {/* Motion Tracking Gesture Style Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>Motion Gesture Style:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { id: "point_auto", label: "👉 Point Auto-Trace" },
                      { id: "fist_open", label: "✋ Palm / ✊ Fist" },
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          if (g.id === "point_auto") {
                            // Point mode requires sequential snapping
                            onUpdateSettings({ gestureStyle: g.id, snappingMode: "sequential" });
                          } else {
                            onUpdateSettings({ gestureStyle: g.id });
                          }
                        }}
                        style={{
                          background: (gameSettings.gestureStyle || "fist_open") === g.id ? colors.accent : "rgba(255,255,255,0.06)",
                          color: (gameSettings.gestureStyle || "fist_open") === g.id ? "#fff" : colors.textDim,
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 10, color: colors.textDim, background: "rgba(0,0,0,0.25)", padding: "6px 10px", borderRadius: 8 }}>
                  {(gameSettings.gestureStyle || "fist_open") === "point_auto" ? (
                    <span>👉 <b>Point Auto-Trace</b>: Continuous pointing trace (Sequential Only — chains A ➔ B ➔ C).</span>
                  ) : (
                    <span>✋ <b>Palm & Fist Mode</b>: <b>Open Palm</b> = trace & connect · <b>Closed Fist</b> = pause/stop tracing (Supports Freeform).</span>
                  )}
                </div>
              </div>

              {/* Snapping Flow Mode (Sequential Chain vs Freeform) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>Snapping Flow Mode:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { id: "freeform", label: "✨ Freeform (Any Star)", disabled: (gameSettings.gestureStyle || "fist_open") === "point_auto" },
                      { id: "sequential", label: "⛓️ Sequential (A➔B➔C)", disabled: false },
                    ].map((s) => (
                      <button
                        key={s.id}
                        disabled={s.disabled}
                        onClick={() => !s.disabled && onUpdateSettings({ snappingMode: s.id })}
                        style={{
                          background: s.disabled
                            ? "rgba(255,255,255,0.02)"
                            : (gameSettings.snappingMode || "freeform") === s.id
                            ? colors.accent
                            : "rgba(255,255,255,0.06)",
                          color: s.disabled
                            ? "rgba(255,255,255,0.2)"
                            : (gameSettings.snappingMode || "freeform") === s.id
                            ? "#fff"
                            : colors.textDim,
                          border: s.disabled ? "1px dashed rgba(255,255,255,0.1)" : "none",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: s.disabled ? "not-allowed" : "pointer",
                          transition: "all 0.15s",
                          opacity: s.disabled ? 0.45 : 1,
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 10, color: colors.textDim, background: "rgba(0,0,0,0.25)", padding: "6px 10px", borderRadius: 8 }}>
                  {(gameSettings.gestureStyle || "fist_open") === "point_auto" ? (
                    <span style={{ color: "#facc15" }}>⚠️ <b>Point Mode is locked to Sequential Snapping</b> (Freeform requires Mouse or ✋ Palm/Fist gesture).</span>
                  ) : (gameSettings.snappingMode || "freeform") === "freeform" ? (
                    <span>✨ <b>Freeform Mode (Mouse & ✋ Palm/Fist)</b>: Start anywhere, connect in any order. Retracing an exact edge untraces it.</span>
                  ) : (
                    <span>⛓️ <b>Sequential Chain</b>: Continuously chains from the head star A ➔ B ➔ C. Backtracking undoes the previous node in the chain.</span>
                  )}
                </div>
              </div>

              {/* Fake Star Decoy Snapping Toggle (Medium & Hard) */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>Trap Stars (Decoy Snapping):</div>
                  <div style={{ fontSize: 10, color: colors.textDim }}>Allow accidental snapping to fake stars in Medium/Hard</div>
                </div>
                <button
                  onClick={() => onUpdateSettings({ allowFakeNodeTrace: !(gameSettings.allowFakeNodeTrace ?? true) })}
                  style={{
                    background: (gameSettings.allowFakeNodeTrace ?? true) ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.06)",
                    color: (gameSettings.allowFakeNodeTrace ?? true) ? "#f87171" : colors.textDim,
                    border: `1px solid ${(gameSettings.allowFakeNodeTrace ?? true) ? "rgba(239, 68, 68, 0.4)" : "transparent"}`,
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {(gameSettings.allowFakeNodeTrace ?? true) ? "⚠️ ENABLED (Can Trap)" : "🛡️ DISABLED (Safe)"}
                </button>
              </div>

              {/* Constellations Per Session (Level Count) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>Constellations Per Session:</div>
                    <div style={{ fontSize: 10, color: colors.textDim }}>Aries (Tutorial) + randomized pool from database</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 3, 5, 8, 12].map((num) => (
                      <button
                        key={num}
                        onClick={() => onUpdateSettings({ levelsPerSession: num })}
                        style={{
                          background: (gameSettings.levelsPerSession || 3) === num ? colors.accent : "rgba(255,255,255,0.06)",
                          color: (gameSettings.levelsPerSession || 3) === num ? "#fff" : colors.textDim,
                          border: (gameSettings.levelsPerSession || 3) === num ? `1px solid ${colors.iconPurple}` : "1px solid transparent",
                          borderRadius: 8,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {num === 1 ? '1 (Tutorial Only)' : `${num} Stages`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Snapping Radius Multiplier Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>Magnetic Snapping Radius:</div>
                    <div style={{ fontSize: 10, color: colors.textDim }}>Increase star hitbox size for easier wand/mouse connection</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: colors.gold, background: "rgba(244, 213, 141, 0.15)", padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(244, 213, 141, 0.3)" }}>
                    {((gameSettings.snappingRadiusMultiplier || 1.0) * 100).toFixed(0)}% ({((gameSettings.snappingRadiusMultiplier || 1.0)).toFixed(1)}x)
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 10, color: colors.textDim }}>1.0x (Default)</span>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.1"
                    value={gameSettings.snappingRadiusMultiplier || 1.0}
                    onChange={(e) => onUpdateSettings({ snappingRadiusMultiplier: parseFloat(e.target.value) })}
                    style={{
                      flex: 1,
                      accentColor: colors.gold,
                      cursor: "pointer",
                    }}
                  />
                  <span style={{ fontSize: 10, color: colors.textDim }}>2.5x (Super Magnetic)</span>
                </div>
              </div>

              {/* Reverse Trace Undo Info Banner */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.3)", padding: "7px 10px", borderRadius: 8, marginTop: 2 }}>
                <span style={{ fontSize: 14 }}>↩️</span>
                <div style={{ fontSize: 11, color: colors.cyan, fontWeight: 600 }}>
                  <b>Reverse Trace is Active:</b> Backtrack / glide backwards across the last connection to instantly undo a mistake!
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>In-Game Camera Preview (PIP):</span>
                <button
                  onClick={() => onUpdateSettings({ showCamPip: !gameSettings.showCamPip })}
                  style={{
                    background: gameSettings.showCamPip ? "rgba(74, 222, 128, 0.2)" : "rgba(255,255,255,0.06)",
                    color: gameSettings.showCamPip ? "#4ade80" : colors.textDim,
                    border: `1px solid ${gameSettings.showCamPip ? "rgba(74, 222, 128, 0.4)" : "transparent"}`,
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📷 {gameSettings.showCamPip ? "ENABLED (Visible in gameplay)" : "DISABLED (Hidden in gameplay)"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Webcam Feed & MediaPipe Telemetry */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Live Camera Feed Card */}
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 20,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Video size={16} color={colors.iconPurple} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>LIVE WEBCAM STREAM</span>
                </div>
                <span
                  style={{
                    background: pointer ? "rgba(74, 222, 128, 0.15)" : "rgba(248, 113, 113, 0.15)",
                    color: pointer ? "#4ade80" : "#f87171",
                    border: `1px solid ${pointer ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
                    borderRadius: 12,
                    padding: "3px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {pointer ? "🟢 HAND DETECTED (60 FPS)" : "🔴 NO HAND IN FRAME"}
                </span>
              </div>

              {/* Hardware Video Stream Element */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 220,
                  background: "#000",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)", // Mirror perspective
                  }}
                />
                {!pointer && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
                    <div style={{ textAlign: "center", padding: 12 }}>
                      <div style={{ fontSize: 24 }}>✋</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textDim, marginTop: 4 }}>
                        Raise index finger / wand into camera frame
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Real-time Telemetry Stats Card */}
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 20,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={16} color={colors.cyan} />
                <span style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>MEDIAPIPE TELEMETRY</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "rgba(15,23,42,0.6)", padding: "8px 12px", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: colors.textDim, fontWeight: 700 }}>GESTURE STATE</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: colors.gold, marginTop: 2 }}>{gestureStatus}</div>
                </div>

                <div style={{ background: "rgba(15,23,42,0.6)", padding: "8px 12px", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: colors.textDim, fontWeight: 700 }}>1€ SMOOTHING FILTER</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: colors.success, marginTop: 2 }}>Active (MinCut: 1.2, Beta: 0.05)</div>
                </div>

                <div style={{ background: "rgba(15,23,42,0.6)", padding: "8px 12px", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: colors.textDim, fontWeight: 700 }}>COORDINATES (X, Y)</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: colors.cyan, marginTop: 2 }}>
                    {pointer ? `${(pointer.x * 100).toFixed(1)}%, ${(pointer.y * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>

                <div style={{ background: "rgba(15,23,42,0.6)", padding: "8px 12px", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: colors.textDim, fontWeight: 700 }}>MAGNETIC TARGET</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: colors.text, marginTop: 2 }}>
                    {snapped?.node?.label || "None (In Flight)"}
                  </div>
                </div>
              </div>

              {/* Constellation Stage Selector */}
              {constellations.length > 0 && (
                <div style={{ marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: colors.textDim, marginBottom: 6 }}>
                    SELECT CONSTELLATION CHALLENGE STAGE:
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {constellations.map((c, idx) => (
                      <button
                        key={c.id || idx}
                        onClick={() => setSelectedConstellationIdx(idx)}
                        style={{
                          background: selectedConstellationIdx === idx ? colors.accent : "rgba(255,255,255,0.06)",
                          color: selectedConstellationIdx === idx ? "#fff" : colors.textDim,
                          border: "none",
                          borderRadius: 8,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        #{idx + 1} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATABASE ADMIN & PLAYER ENTRIES                                    */}
      {/* ========================================================================= */}
      {activeTab === "database" && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: 1040,
            padding: "0 18px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Database Quick Stats */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "TOTAL REGISTERED", value: registrations.length, color: colors.gold },
              { label: "CICS PLAYERS", value: registrations.filter((r) => r.department === "CICS").length, color: colors.cyan },
              { label: "COMPLETED SESSIONS (3/3)", value: registrations.filter((r) => (r.attempts_used || 0) >= 3).length, color: colors.danger },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 150,
                  background: colors.cardBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: 16,
                  padding: "12px 14px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: 0.5 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Main Table Container */}
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: 20,
              padding: 20,
            }}
          >
            {/* Search Input Bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} color={colors.textDim} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search by name, SR-code, course, section..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: 12,
                    padding: "0 14px 0 40px",
                    color: colors.text,
                    fontSize: 13,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
              <button
                onClick={fetchRegistrations}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.text,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RefreshCw size={13} className={loading ? "spin-icon" : ""} /> REFRESH
              </button>
            </div>

            {/* Players Table */}
            <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, background: colors.cardBg, zIndex: 2 }}>
                  <tr style={{ borderBottom: `1px solid ${colors.inputBorder}`, color: colors.textDim, fontSize: 11, fontWeight: 700 }}>
                    <th style={{ padding: "10px 12px" }}>SR-CODE</th>
                    <th style={{ padding: "10px 12px" }}>PLAYER NAME</th>
                    <th style={{ padding: "10px 12px" }}>COLLEGE / DEPT</th>
                    <th style={{ padding: "10px 12px" }}>COURSE</th>
                    <th style={{ padding: "10px 12px" }}>ATTEMPTS</th>
                    <th style={{ padding: "10px 12px" }}>BEST SCORE</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="table-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px", fontWeight: 700, color: colors.cyan }}>{r.sr_code}</td>
                      <td style={{ padding: "12px", fontWeight: 700, color: colors.text }}>
                        {r.last_name}, {r.first_name} {r.middle_initial || ""}
                      </td>
                      <td style={{ padding: "12px", color: colors.gold, fontWeight: 700 }}>
                        {r.department || "CICS"}
                      </td>
                      <td style={{ padding: "12px", color: colors.textDim }}>
                        {r.course || "BSCS"} {r.year_level && `(${r.year_level})`}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            background: (r.attempts_used || 0) >= 3 ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)",
                            color: (r.attempts_used || 0) >= 3 ? colors.danger : colors.success,
                            padding: "3px 8px",
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {r.attempts_used || 0} / 3
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontWeight: 800, color: colors.gold }}>{r.best_score || 0}</td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            onClick={() => {
                              if (onLaunchChallenge) {
                                onLaunchChallenge(0, r);
                              }
                            }}
                            title="Play Now (Launch Challenge Directly)"
                            className="action-btn"
                            style={{
                              background: "rgba(74,222,128,0.18)",
                              border: "1px solid rgba(74,222,128,0.4)",
                              color: colors.success,
                              borderRadius: 8,
                              padding: "6px 10px",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            <Play size={13} fill={colors.success} /> PLAY
                          </button>
                          <button
                            onClick={() => setActiveTicket(r)}
                            title="View QR Ticket"
                            className="action-btn"
                            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: colors.iconPurple, borderRadius: 8, padding: 6 }}
                          >
                            <QrCode size={14} />
                          </button>
                          <button
                            onClick={() => handleReset(r.id)}
                            title="Reset Attempts"
                            className="action-btn"
                            style={{ background: "rgba(244,213,141,0.15)", border: "1px solid rgba(244,213,141,0.3)", color: colors.gold, borderRadius: 8, padding: 6 }}
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Delete Record"
                            className="action-btn"
                            style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: colors.danger, borderRadius: 8, padding: 6 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" style={{ padding: "40px 12px", textAlign: "center", color: colors.textDim }}>
                        No registered players found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Popup Overlay */}
      {activeTicket && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 320,
              background: "linear-gradient(160deg, #070c1a 0%, #030712 100%)",
              border: `1px solid rgba(244, 213, 141, 0.35)`,
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 30px 60px rgba(0,0,0,0.8)",
              textAlign: "center",
            }}
          >
            <button
              onClick={() => setActiveTicket(null)}
              style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: colors.textDim, cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <div style={{ fontSize: 13, fontWeight: 800, color: colors.gold, letterSpacing: 1, marginBottom: 12 }}>
              PLAYER TICKET DETAILS
            </div>

            <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 2 }}>
              {activeTicket.first_name} {activeTicket.last_name}
            </div>
            <div style={{ fontSize: 11, color: colors.cyan, fontWeight: 700, marginBottom: 12 }}>
              {activeTicket.sr_code}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div style={{ position: "relative", padding: 10, background: "#ffffff", borderRadius: 14, display: "inline-block" }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
                    activeTicket.ticket_token ? `BSU-TICKET:${activeTicket.ticket_token}` : `BSU-TICKET:${activeTicket.id}:${activeTicket.sr_code}`
                  )}`}
                  alt="QR Code"
                  style={{ width: 150, height: 150, display: "block" }}
                />
              </div>
            </div>

            <button
              onClick={() => setActiveTicket(null)}
              style={{
                width: "100%",
                height: 38,
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #4338ca 0%, #312e81 100%)",
                color: colors.text,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
