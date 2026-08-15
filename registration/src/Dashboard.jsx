import { useState, useEffect, useMemo } from "react";
import { Search, Trash2, RotateCcw, QrCode, RefreshCw, X, HelpCircle } from "lucide-react";

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

export default function Dashboard({ onBack }) {
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

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

  const filtered = registrations.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(term) ||
      r.last_name.toLowerCase().includes(term) ||
      r.sr_code.toLowerCase().includes(term) ||
      (r.course && r.course.toLowerCase().includes(term)) ||
      (r.section && r.section.toLowerCase().includes(term))
    );
  });

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        background: colors.bg,
        fontFamily: "'Outfit', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 0 40px",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0.25} 50%{opacity:1} }
        .action-btn { transition: all 0.2s ease; cursor: pointer; }
        .action-btn:hover { transform: scale(1.1); }
        .action-btn:active { transform: scale(0.95); }
        .table-row { transition: background-color 0.2s; }
        .table-row:hover { background: rgba(255, 255, 255, 0.02) !important; }
      `}</style>

      <Starfield />

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 960,
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
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: 0.5,
          }}
        >
          ← FORM
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: 2 }}>
            DATABASE ADMIN
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: colors.text, letterSpacing: 1 }}>
            PLAYER ENTRIES
          </div>
        </div>

        <button
          onClick={fetchRegistrations}
          disabled={loading}
          style={{
            background: "rgba(15,23,42,0.8)",
            border: `1px solid ${colors.inputBorder}`,
            color: colors.cyan,
            borderRadius: 12,
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} className={loading ? "spin-icon" : ""} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          REFRESH
        </button>
      </div>

      {/* Database Quick Stats */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 920,
          display: "flex",
          gap: 12,
          padding: "0 18px",
          boxSizing: "border-box",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "TOTAL REGISTERED", value: registrations.length, color: colors.gold },
          { label: "CICS PLAYERS", value: registrations.filter(r => r.department === "CICS").length, color: colors.cyan },
          { label: "COMPLETED SESSIONS (3/3)", value: registrations.filter(r => (r.attempts_used || 0) >= 3).length, color: colors.danger },
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
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 920,
          padding: "0 18px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 24,
            padding: "16px 18px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          }}
        >
          {/* Controls bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: 260,
              }}
            >
              <Search
                size={16}
                color={colors.textDim}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                placeholder="Search SR-Code, Name, Course, Section..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: 12,
                  padding: "0 14px 0 38px",
                  boxSizing: "border-box",
                  color: colors.text,
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textDim }}>
              Showing {filtered.length} entries
            </div>
          </div>

          {/* Database Table */}
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.inputBorder}` }}>
                  <th style={{ padding: "10px 12px", color: colors.textDim, fontWeight: 700 }}>PLAYER</th>
                  <th style={{ padding: "10px 12px", color: colors.textDim, fontWeight: 700 }}>SR-CODE</th>
                  <th style={{ padding: "10px 12px", color: colors.textDim, fontWeight: 700 }}>DEPT / COURSE</th>
                  <th style={{ padding: "10px 12px", color: colors.textDim, fontWeight: 700 }}>YEAR / SECTION</th>
                  <th style={{ padding: "10px 12px", color: colors.textDim, fontWeight: 700, textAlign: "center" }}>ATTEMPTS</th>
                  <th style={{ padding: "10px 12px", color: colors.textDim, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((player, idx) => {
                  const attempts = player.attempts_used || 0;
                  const isFinished = attempts >= 3;
                  return (
                    <tr
                      key={player.id}
                      className="table-row"
                      style={{
                        background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                        borderBottom: `1px solid rgba(255,255,255,0.03)`,
                      }}
                    >
                      <td style={{ padding: "12px", fontWeight: 700, color: colors.text }}>
                        {player.first_name} {player.last_name}
                      </td>
                      <td style={{ padding: "12px", fontFamily: "monospace", color: colors.cyan }}>
                        {player.sr_code}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ fontSize: 10, background: "rgba(99,102,241,0.15)", color: colors.iconPurple, padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>
                          {player.department}
                        </span>
                        <span style={{ color: colors.textDim }}>{player.course}</span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ color: colors.textDim }}>{player.year_level}</span>
                        {player.section && (
                          <span style={{ color: colors.success, marginLeft: 6, fontWeight: 600 }}>
                            {player.section}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span
                          style={{
                            background: isFinished ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)",
                            color: isFinished ? colors.danger : colors.success,
                            padding: "3px 8px",
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 10,
                          }}
                        >
                          {attempts} / 3
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
                          {/* QR Code view */}
                          <button
                            className="action-btn"
                            title="Show Ticket QR Code"
                            onClick={() => setActiveTicket(player)}
                            style={{ background: "none", border: "none", color: colors.gold, cursor: "pointer", padding: 0 }}
                          >
                            <QrCode size={16} />
                          </button>
                          {/* Reset Attempts */}
                          <button
                            className="action-btn"
                            title="Reset Game Attempts to 0"
                            onClick={() => handleReset(player.id)}
                            style={{ background: "none", border: "none", color: colors.cyan, cursor: "pointer", padding: 0 }}
                          >
                            <RotateCcw size={16} />
                          </button>
                          {/* Delete Entry */}
                          <button
                            className="action-btn"
                            title="Delete Player Entry"
                            onClick={() => handleDelete(player.id)}
                            style={{ background: "none", border: "none", color: colors.danger, cursor: "pointer", padding: 0 }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

            {activeTicket.ticket_token && (
              <div style={{ fontFamily: "monospace", fontSize: 9, color: colors.textDim, marginBottom: 14 }}>
                TOKEN: {activeTicket.ticket_token}
              </div>
            )}

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
