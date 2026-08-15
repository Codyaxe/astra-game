import { useEffect, useRef, useState, useMemo } from "react";
import jsQR from "jsqr";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
const GAME_URL = import.meta.env.VITE_GAME_URL || `${window.location.protocol}//${window.location.hostname}:5173`;

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

// States for the scanner flow
const STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  LOADING: "loading",
  RESULT: "result",
};

export default function Scanner({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  const [state, setState] = useState(STATE.IDLE);
  const [scannedData, setScannedData] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    setError("");
    setResult(null);
    setScannedData(null);
    setState(STATE.SCANNING);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      requestAnimationFrame(tick);
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions and try again.");
      setState(STATE.IDLE);
    }
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      stopCamera();
      setScannedData(code.data);
      handleTicket(code.data);
      return;
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }

  async function handleTicket(raw) {
    setState(STATE.LOADING);
    try {
      const res = await fetch(`${BACKEND_URL}/use-attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: raw }),
      });
      const data = await res.json();
      setResult(data);
      setState(STATE.RESULT);

      // Start countdown to "launch game" if allowed
      if (data.status === "allowed") {
        let t = 3;
        setCountdown(t);
        const timer = setInterval(() => {
          t--;
          setCountdown(t);
          if (t <= 0) {
            clearInterval(timer);
            setCountdown(null);
            
            // Redirect to main game with player registration details
            const player = data.player;
            const attemptsRemaining = data.attempts_remaining;
            const params = new URLSearchParams({
              autostart: "true",
              first_name: player.first_name || "",
              last_name: player.last_name || "",
              sr_code: player.sr_code || "",
              course: player.course || "",
              mi: player.mi || "",
              department: player.department || "",
              year_level: player.year_level || "",
              section: player.section || "",
              attempts_remaining: attemptsRemaining !== undefined ? String(attemptsRemaining) : "3",
              ticket_token: player.ticket_token || ""
            });
            window.location.href = `${GAME_URL}/?${params.toString()}`;
          }
        }, 1000);
      }
    } catch (err) {
      setResult({ status: "denied", error: "Cannot reach game server. Check network." });
      setState(STATE.RESULT);
    }
  }

  function reset() {
    setResult(null);
    setScannedData(null);
    setError("");
    setCountdown(null);
    setState(STATE.IDLE);
    stopCamera();
  }

  const isAllowed = result?.status === "allowed";

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
        padding: "0 0 24px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0.25} 50%{opacity:1} }
        @keyframes scanLine {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scan-btn:active { transform: scale(0.97); }
      `}</style>

      <Starfield />

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px 0",
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
          ← BACK
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: 2 }}>
            GAME STATION
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, letterSpacing: 1 }}>
            TICKET SCANNER
          </div>
        </div>

        <div
          style={{
            width: 60,
            textAlign: "right",
            fontSize: 9,
            fontWeight: 700,
            color: colors.success,
            letterSpacing: 0.5,
          }}
        >
          ONLINE
        </div>
      </div>

      {/* Title */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", margin: "12px 0 16px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: colors.text, letterSpacing: 2 }}>
          SCAN GAME PASS
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: colors.gold, fontSize: 12 }}>✦</span>
          <span style={{ color: colors.gold, fontWeight: 700, fontSize: 11, letterSpacing: 3 }}>
            TICKET
          </span>
          <span style={{ color: colors.gold, fontSize: 12 }}>✦</span>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 360,
          padding: "0 18px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Camera Viewfinder / Result Box */}
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            background: colors.cardBg,
            border: `1px solid ${
              state === STATE.RESULT
                ? isAllowed
                  ? colors.success
                  : colors.danger
                : "rgba(244, 213, 141, 0.3)"
            }`,
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: state === STATE.RESULT
              ? `0 0 40px ${isAllowed ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`
              : "0 20px 50px rgba(0,0,0,0.6)",
            transition: "border-color 0.4s, box-shadow 0.4s",
          }}
        >
          {/* Gold corners always visible */}
          <span style={{ position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTop: `3px solid ${colors.gold}`, borderLeft: `3px solid ${colors.gold}`, borderTopLeftRadius: 8, zIndex: 5 }} />
          <span style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTop: `3px solid ${colors.gold}`, borderRight: `3px solid ${colors.gold}`, borderTopRightRadius: 8, zIndex: 5 }} />
          <span style={{ position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottom: `3px solid ${colors.gold}`, borderLeft: `3px solid ${colors.gold}`, borderBottomLeftRadius: 8, zIndex: 5 }} />
          <span style={{ position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottom: `3px solid ${colors.gold}`, borderRight: `3px solid ${colors.gold}`, borderBottomRightRadius: 8, zIndex: 5 }} />

          {/* Camera feed */}
          <video
            ref={videoRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: state === STATE.SCANNING ? "block" : "none",
            }}
            muted
            playsInline
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Scanning line animation */}
          {state === STATE.SCANNING && (
            <div
              style={{
                position: "absolute",
                left: 20,
                right: 20,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${colors.gold}, transparent)`,
                animation: "scanLine 2s linear infinite",
                zIndex: 4,
                boxShadow: `0 0 8px ${colors.gold}`,
              }}
            />
          )}

          {/* IDLE state */}
          {state === STATE.IDLE && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📷</div>
              <div style={{ color: colors.gold, fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>
                READY TO SCAN
              </div>
              <div style={{ color: colors.textDim, fontSize: 11, marginTop: 4 }}>
                Point camera at player's QR ticket
              </div>
            </div>
          )}

          {/* Loading state */}
          {state === STATE.LOADING && (
            <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
              <div style={{ color: colors.cyan, fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>
                VALIDATING TICKET...
              </div>
              <div style={{ color: colors.textDim, fontSize: 10, marginTop: 4 }}>
                {scannedData?.slice(0, 30)}...
              </div>
            </div>
          )}

          {/* Result state */}
          {state === STATE.RESULT && result && (
            <div style={{ textAlign: "center", padding: "16px 20px", animation: "fadeIn 0.4s ease", width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 64, marginBottom: 4, lineHeight: 1 }}>
                {isAllowed ? "🎉" : "❌"}
              </div>

              {isAllowed && result.player ? (
                // Welcome screen for successfully authenticated player
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: colors.success,
                      letterSpacing: 2,
                      textShadow: `0 0 10px rgba(74,222,128,0.4)`,
                    }}
                  >
                    ACCESS GRANTED
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: colors.gold,
                      letterSpacing: 1.5,
                      lineHeight: 1.2,
                      margin: "2px 0 6px",
                      textTransform: "uppercase"
                    }}
                  >
                    WELCOME, {result.player.first_name}!
                  </div>
                  
                  <div
                    style={{
                      background: "rgba(15,23,42,0.85)",
                      border: `1px solid rgba(74,222,128,0.3)`,
                      borderRadius: 16,
                      padding: "10px 14px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                      {result.player.first_name} {result.player.last_name}
                    </div>
                    <div style={{ fontSize: 10, color: colors.textDim, fontFamily: "monospace", marginTop: 2 }}>
                      SR-CODE: {result.player.sr_code}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: colors.textDim }}>GAME PASS STATE</span>
                      <span style={{ fontSize: 11, color: colors.success, fontWeight: 800 }}>
                        ATTEMPT {result.attempts_used} / 3
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Access Denied screen
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: 1.5,
                      color: colors.danger,
                      marginBottom: 6,
                    }}
                  >
                    ACCESS DENIED
                  </div>
                  {result.player && (
                    <div
                      style={{
                        background: "rgba(15,23,42,0.85)",
                        border: `1px solid rgba(248,113,113,0.3)`,
                        borderRadius: 16,
                        padding: "10px 14px",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                        {result.player.first_name} {result.player.last_name}
                      </div>
                      <div style={{ fontSize: 10, color: colors.textDim, fontFamily: "monospace", marginTop: 2 }}>
                        SR-CODE: {result.player.sr_code}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: colors.textDim }}>GAME PASS STATE</span>
                        <span style={{ fontSize: 11, color: colors.danger, fontWeight: 800 }}>
                          ATTEMPTS EXHAUSTED (3/3)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!result.player && (
                <div style={{ fontSize: 12, color: colors.danger, marginTop: 4 }}>
                  {result.error || result.message}
                </div>
              )}

              {/* Countdown to game launch */}
              {isAllowed && countdown !== null && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: colors.gold,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  🎮 LAUNCHING GAME IN {countdown}...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: "rgba(248,113,113,0.1)",
              border: `1px solid ${colors.danger}`,
              color: colors.danger,
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 600,
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Action buttons */}
        {state === STATE.IDLE && (
          <button
            className="scan-btn"
            onClick={startCamera}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 16,
              border: `1px solid rgba(244,213,141,0.4)`,
              background: "linear-gradient(135deg, #4338ca 0%, #312e81 100%)",
              boxShadow: `0 8px 24px ${colors.accentGlow}`,
              color: colors.text,
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: 2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "transform 0.1s",
            }}
          >
            📷 START SCANNING
          </button>
        )}

        {state === STATE.SCANNING && (
          <button
            onClick={reset}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid rgba(255,255,255,0.1)`,
              background: "rgba(15,23,42,0.8)",
              color: colors.textDim,
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            ✕ CANCEL
          </button>
        )}

        {state === STATE.RESULT && (
          <button
            className="scan-btn"
            onClick={() => {
              reset();
              setTimeout(startCamera, 100);
            }}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 16,
              border: `1px solid rgba(244,213,141,0.4)`,
              background: "linear-gradient(135deg, #4338ca 0%, #312e81 100%)",
              boxShadow: `0 8px 24px ${colors.accentGlow}`,
              color: colors.text,
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 1.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "transform 0.1s",
            }}
          >
            🔄 SCAN NEXT TICKET
          </button>
        )}

        {/* Instructions */}
        {state === STATE.IDLE && (
          <div
            style={{
              width: "100%",
              background: colors.cardBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: 16,
              padding: "12px 16px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: colors.gold, letterSpacing: 1, marginBottom: 8 }}>
              HOW IT WORKS
            </div>
            {[
              ["📱", "Student shows QR ticket on their phone"],
              ["📷", "Point this device camera at their screen"],
              ["✅", "Ticket validates → game session starts"],
              ["🎮", "Each player gets 3 game attempts max"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{icon}</span>
                <span style={{ fontSize: 11, color: colors.textDim, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom mountain silhouette */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 80, pointerEvents: "none", zIndex: 0 }}>
          <div
            style={{
              position: "absolute",
              bottom: -20,
              left: "50%",
              transform: "translateX(-50%)",
              width: 200,
              height: 60,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0) 75%)",
              filter: "blur(12px)",
            }}
          />
          <svg viewBox="0 0 1440 80" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 60 }} preserveAspectRatio="none">
            <path fill="#010206" d="M0,60L60,52C120,45,240,30,360,35C480,40,600,65,720,68C840,70,960,52,1080,42C1200,32,1320,32,1380,32L1440,32L1440,80L0,80Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
