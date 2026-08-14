/**
 * RegistrationScreen.jsx — Registration on Kiosk:
 * 1. Primary path: Scan student ID with webcam OCR (auto-fills First Name, Last Name, Course, SR-Code).
 * 2. Fallback path (No ID): Displays QR code directing phone to local-network mobile registration.
 * 3. Ticket Scan: Scan existing QR ticket to load remaining attempts (out of 3).
 */

import { useRef, useState } from 'react';
import { registerPlayer, ocrUpload, scanTicket } from '../services/api';

export default function RegistrationScreen({ onRegistered, onGoToMobileUrl }) {
  const [tab, setTab] = useState('ocr'); // 'ocr' | 'ticket' | 'fallback_qr'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [srCode, setSrCode] = useState('');
  const [course, setCourse] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [ticketInput, setTicketInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Local fallback registration URL (pointing to the mobile view)
  const mobileRegistrationUrl = `${window.location.origin}/?mode=mobile`;

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      console.warn('Webcam unavailable:', e);
    }
  }

  async function handleOcrScan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      try {
        setLoading(true);
        const result = await ocrUpload(blob);
        if (result.first_name) setFirstName(result.first_name);
        if (result.last_name) setLastName(result.last_name);
        if (result.sr_code) setSrCode(result.sr_code);
        if (result.course) setCourse(result.course);
      } catch (e) {
        setError('OCR scan failed, please fill in manually.');
      } finally {
        setLoading(false);
      }
    }, 'image/png');
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !srCode.trim() || !course.trim()) {
      setError('Please fill in First Name, Last Name, SR-Code, and Course.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerPlayer({
        firstName,
        lastName,
        srCode,
        course,
        contactNumber,
      });
      onRegistered(res.player, res.attempts_remaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTicketSubmit(e) {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    setLoading(true);
    try {
      const res = await scanTicket(ticketInput.trim());
      if (!res.can_play) {
        setError('You have already used all 3 attempts!');
      } else {
        onRegistered(res.player, res.attempts_remaining);
      }
    } catch (err) {
      setError(err.message || 'Invalid QR Ticket code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen screen--register">
      <div className="register-container">
        <div className="register-tabs">
          <button
            className={`tab-btn ${tab === 'ocr' ? 'active' : ''}`}
            onClick={() => setTab('ocr')}
          >
            📷 ID Scan / Register
          </button>
          <button
            className={`tab-btn ${tab === 'ticket' ? 'active' : ''}`}
            onClick={() => setTab('ticket')}
          >
            🎟️ Scan QR Ticket
          </button>
          <button
            className={`tab-btn ${tab === 'fallback_qr' ? 'active' : ''}`}
            onClick={() => setTab('fallback_qr')}
          >
            📱 No ID? Mobile QR
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {tab === 'ocr' && (
          <form className="register-card" onSubmit={handleFormSubmit}>
            <h2>Player Registration</h2>

            {/* OCR Camera Preview */}
            <div className="ocr-area">
              <video ref={videoRef} autoPlay playsInline className="ocr-video" />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="ocr-buttons">
                <button type="button" onClick={startCamera} className="btn-ocr">
                  📹 Turn on Camera
                </button>
                <button type="button" onClick={handleOcrScan} className="btn-ocr" disabled={loading}>
                  🔍 Scan Student ID
                </button>
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>SR-Code</label>
                <input
                  type="text"
                  value={srCode}
                  onChange={(e) => setSrCode(e.target.value)}
                  placeholder="e.g. 20-12345"
                  required
                />
              </div>
              <div>
                <label>Course</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. BSCS"
                  required
                />
              </div>
            </div>

            <label>Contact Number (for prize claiming)</label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="09123456789"
            />

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Submitting…' : '✦ Start Game (3 Attempts Max)'}
            </button>
          </form>
        )}

        {tab === 'ticket' && (
          <form className="register-card" onSubmit={handleTicketSubmit}>
            <h2>Scan Existing QR Ticket</h2>
            <p className="tab-hint">Enter or scan the QR ticket code from your phone:</p>
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="ASTRA-XXXXX"
              required
            />
            <button type="submit" className="btn-submit" disabled={loading}>
              Load Attempt
            </button>
          </form>
        )}

        {tab === 'fallback_qr' && (
          <div className="register-card fallback-qr-card">
            <h2>No Student ID?</h2>
            <p className="tab-hint">
              1. Connect your phone to the local venue Wi-Fi.<br />
              2. Scan the QR code below on your phone to open the mobile registration form.<br />
              3. Download your generated QR Ticket to play.
            </p>
            <div className="qr-preview-box">
              {/* Fallback QR generation via public helper or backend endpoint */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileRegistrationUrl)}`}
                alt="Mobile Registration QR"
                className="qr-img"
              />
            </div>
            <p className="local-url-text">{mobileRegistrationUrl}</p>
            <button type="button" className="btn-ocr" onClick={onGoToMobileUrl}>
              Open Mobile Form Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
