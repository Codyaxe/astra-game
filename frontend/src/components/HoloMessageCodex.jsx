/**
 * HoloMessageCodex.jsx — Sci-Fi Transparent Holographic Message & Controls Screen
 *
 * Implements a transparent, glassmorphic sci-fi Codex / Message Console inspired by
 * futuristic cockpit telemetry with glowing neon cyan chamfered cards, tech borders,
 * dynamic audio playback, and interactive mission directives.
 */

import React, { useState } from 'react';

export default function HoloMessageCodex({
  title = "Codex",
  messages = null,
  activeMessageId = null,
  onSelectMessage = null,
  onClose = null,
  style = {},
}) {
  const [selectedId, setSelectedId] = useState(activeMessageId || (messages?.[0]?.id ?? 1));

  const defaultMessages = [
    {
      id: 1,
      tag: "DIRECTIVE",
      title: "Operation Briefing",
      time: "10:24",
      desc: "Positioning sensors offline. Manual stellar navigation required to calculate warp heading.",
      unread: false,
    },
    {
      id: 2,
      tag: "FLIGHT MANUAL",
      title: "Motion Controls (✋ / ✊)",
      time: "09:17",
      desc: "Open Palm ✋ to lock stars & trace starlight beam. Closed Fist ✊ to pause and release anchor.",
      unread: true,
    },
    {
      id: 3,
      tag: "NAVIGATION",
      title: "Freeform Snapping",
      time: "08:42",
      desc: "Connect stars in any sequence. Retracing an existing line untraces and removes the connection.",
      unread: false,
    },
    {
      id: 4,
      tag: "SYSTEM ALERT",
      title: "Decoy Trap Stars",
      time: "07:55",
      desc: "Medium & Hard tiers feature false stars. Accidental connection triggers warning crimson red.",
      unread: false,
    },
    {
      id: 5,
      tag: "TRANSMISSION",
      title: "Ship AI Voice Link",
      time: "07:18",
      desc: "Live audio telemetry broadcasting navigation cues and emergency hull pressure status.",
      unread: false,
    },
    {
      id: 6,
      tag: "MISSION LOG",
      title: "Repair Station Coordinates",
      time: "06:33",
      desc: "Lock stellar coordinates across 3 stages to jump to the BatStateU Deep Space Depot.",
      unread: false,
    },
  ];

  const items = messages || defaultMessages;
  const activeItem = items.find((m) => m.id === selectedId) || items[0];

  function handleCardClick(item) {
    setSelectedId(item.id);
    onSelectMessage?.(item);
  }

  return (
    <div
      className="holo-codex-container"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '960px',
        margin: '0 auto',
        fontFamily: "'Outfit', 'Sora', system-ui, sans-serif",
        color: '#E2E8F0',
        zIndex: 50,
        ...style,
      }}
    >
      <style>{`
        @keyframes holoPulse {
          0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.4)); }
          50% { opacity: 1; filter: drop-shadow(0 0 20px rgba(0, 240, 255, 0.8)); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        .holo-card-hover {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .holo-card-hover:hover {
          transform: translateY(-2px) scale(1.015);
          background: rgba(0, 180, 255, 0.12) !important;
          border-color: rgba(0, 240, 255, 0.8) !important;
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.35), inset 0 0 15px rgba(0, 240, 255, 0.2) !important;
        }
      `}</style>

      {/* Main Transparent Sci-Fi Outer Hull Frame */}
      <div
        style={{
          position: 'relative',
          background: 'rgba(3, 10, 26, 0.68)', // Transparent deep space glass
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(0, 240, 255, 0.45)',
          borderRadius: '24px',
          padding: '24px 28px',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.75), inset 0 0 35px rgba(0, 240, 255, 0.08), 0 0 20px rgba(0, 240, 255, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Tech Grid Texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        />

        {/* Top Header Tab with Glowing Chamfered Cap */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            marginBottom: '22px',
          }}
        >
          {/* Left Decorative Circuit Bar */}
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.8))' }} />

          {/* Center Glowing Trapezoid Title Cap */}
          <div
            style={{
              position: 'relative',
              padding: '6px 44px',
              background: 'linear-gradient(180deg, rgba(0, 240, 255, 0.28) 0%, rgba(3, 15, 38, 0.9) 100%)',
              borderTop: '2px solid #00F0FF',
              borderLeft: '1px solid rgba(0, 240, 255, 0.6)',
              borderRight: '1px solid rgba(0, 240, 255, 0.6)',
              clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.4)',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: '0 0 12px rgba(0, 240, 255, 0.95), 0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {title}
            </span>
          </div>

          {/* Right Decorative Circuit Bar */}
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.8), transparent)' }} />
        </div>

        {/* 3x2 Glowing Sci-Fi Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {items.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="holo-card-hover"
                style={{
                  position: 'relative',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(0, 180, 255, 0.22) 0%, rgba(3, 18, 48, 0.75) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 100, 200, 0.08) 0%, rgba(3, 10, 28, 0.55) 100%)',
                  border: isSelected
                    ? '1.5px solid #00F0FF'
                    : '1px solid rgba(0, 240, 255, 0.35)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  minHeight: '112px',
                  cursor: 'pointer',
                  boxShadow: isSelected
                    ? '0 0 30px rgba(0, 240, 255, 0.4), inset 0 0 15px rgba(0, 240, 255, 0.25)'
                    : '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 8px rgba(0, 240, 255, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                {/* Tech Corner Accent Flairs (Cutout Chamfers) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '18px',
                    height: '18px',
                    borderTop: '2px solid rgba(0, 240, 255, 0.8)',
                    borderRight: '2px solid rgba(0, 240, 255, 0.8)',
                    borderTopRightRadius: '14px',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '18px',
                    height: '18px',
                    borderBottom: '2px solid rgba(0, 240, 255, 0.8)',
                    borderLeft: '2px solid rgba(0, 240, 255, 0.8)',
                    borderBottomLeftRadius: '14px',
                    pointerEvents: 'none',
                  }}
                />

                {/* Top Row: Icon + MESSAGE Tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Neon Cyan Envelope Icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.8))' }}
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: isSelected ? '#00F0FF' : 'rgba(0, 240, 255, 0.75)',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      textShadow: isSelected ? '0 0 8px rgba(0, 240, 255, 0.8)' : 'none',
                    }}
                  >
                    {item.tag || "MESSAGE"}
                  </span>
                </div>

                {/* Center Message Title */}
                <div
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: isSelected ? '#FFFFFF' : '#E2E8F0',
                    lineHeight: '1.35',
                    margin: '8px 0',
                    textShadow: isSelected
                      ? '0 0 10px rgba(0, 240, 255, 0.75), 0 2px 4px rgba(0,0,0,0.8)'
                      : '0 1px 3px rgba(0,0,0,0.6)',
                  }}
                >
                  {item.title}
                </div>

                {/* Bottom Row: Timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isSelected ? '#38BDF8' : 'rgba(148, 163, 184, 0.8)',
                    letterSpacing: '1px',
                  }}
                >
                  {item.time || "10:24"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Detailed Message Preview Box (Transparent Glass) */}
        {activeItem && (
          <div
            style={{
              marginTop: '18px',
              background: 'linear-gradient(180deg, rgba(0, 240, 255, 0.08) 0%, rgba(3, 10, 28, 0.6) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.35)',
              borderRadius: '16px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: 'inset 0 0 20px rgba(0, 240, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#00F0FF', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                📡 LIVE TRANSMISSION READOUT:
              </div>
              <div style={{ fontSize: '0.9rem', color: '#F1F5F9', lineHeight: '1.4' }}>
                {activeItem.desc}
              </div>
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                color: '#38BDF8',
                fontWeight: 700,
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
                background: 'rgba(0, 240, 255, 0.12)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 240, 255, 0.4)',
              }}
            >
              CHANNEL: ST-9
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
