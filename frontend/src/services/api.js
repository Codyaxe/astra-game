const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:5000/api`;
};

const BASE_URL = getBaseUrl();

async function _fetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ---- Auth & Registration Flow ----

export function registerPlayer({ firstName, lastName, srCode, course, contactNumber = '', mi = '', department = '', yearLevel = '', section = '' }) {
  return _fetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      sr_code: srCode,
      course,
      contact_number: contactNumber,
      mi,
      department,
      year_level: yearLevel,
      section,
    }),
  });
}

export function mobileRegister({ firstName, lastName, srCode, course, contactNumber = '', mi = '', department = '', yearLevel = '', section = '' }) {
  return _fetch('/auth/mobile-register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      sr_code: srCode,
      course,
      contact_number: contactNumber,
      mi,
      department,
      year_level: yearLevel,
      section,
    }),
  });
}

export function scanTicket(qrTicketCode) {
  return _fetch('/auth/scan-ticket', {
    method: 'POST',
    body: JSON.stringify({ qr_ticket_code: qrTicketCode }),
  });
}

export async function ocrUpload(blob) {
  const form = new FormData();
  form.append('image', blob, 'id_scan.png');
  const res = await fetch(`${BASE_URL}/auth/ocr`, { method: 'POST', body: form });
  return res.json();
}

export function getTicketDownloadUrl(playerId) {
  return `${BASE_URL}/auth/ticket-qr/${playerId}`;
}

// ---- Constellation & Game Operations ----

export function getConstellations() {
  return _fetch('/constellations/');
}

export function getConstellation(id) {
  return _fetch(`/constellations/${id}`);
}

export function startSession(playerId, constellationId) {
  return _fetch('/game/start', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, constellation_id: constellationId }),
  });
}

export function validateStep(constellationId, fromNodeId, toNodeId) {
  return _fetch('/game/validate-step', {
    method: 'POST',
    body: JSON.stringify({
      constellation_id: constellationId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
    }),
  });
}

export function submitAttempt(payloadOrSessionId, telemetry = {}) {
  const body =
    typeof payloadOrSessionId === 'object'
      ? payloadOrSessionId
      : { session_id: payloadOrSessionId, ...telemetry };

  return _fetch('/game/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---- Leaderboard ----

export function getLeaderboard(limit = 10) {
  return _fetch(`/leaderboard/?limit=${limit}`);
}

export function qrResultUrl(playerId) {
  return `${BASE_URL}/leaderboard/qr/${playerId}`;
}
