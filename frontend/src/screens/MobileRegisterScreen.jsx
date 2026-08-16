/**
 * MobileRegisterScreen.jsx — Standalone mobile-optimized registration view
 * accessible by phones connected to the local router.
 *
 * Automatically downloads and displays the QR ticket required to play and retry on Kiosk.
 */

import { useState } from 'react';
import { mobileRegister, getTicketDownloadUrl } from '../services/api';

export default function MobileRegisterScreen({ onBackToKiosk }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [srCode, setSrCode] = useState('');
  const [course, setCourse] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [submittedPlayer, setSubmittedPlayer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !srCode.trim() || !course.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await mobileRegister({
        firstName,
        lastName,
        srCode,
        course,
        contactNumber,
      });
      setSubmittedPlayer(res.player);

      // Auto-trigger download of QR Ticket
      const downloadUrl = getTicketDownloadUrl(res.player.id);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Astra_Ticket_${res.player.sr_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen screen--mobile-register">
      <div className="mobile-card">
        <h1 className="mobile-title">✦ ASTRA Mobile Registration</h1>
        <p className="mobile-subtitle">Local Network Registration Portal</p>

        {error && <p className="form-error">{error}</p>}

        {!submittedPlayer ? (
          <form onSubmit={handleSubmit} className="mobile-form">
            <label>First Name *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />

            <label>Last Name *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />

            <label>SR-Code *</label>
            <input
              type="text"
              value={srCode}
              onChange={(e) => setSrCode(e.target.value)}
              placeholder="e.g. 21-09876"
              required
            />

            <label>Course *</label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. BSCS"
              required
            />

            <label>Contact Number (Optional)</label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="09XXXXXXXXX"
            />

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Generating Ticket…' : '🎟️ Register & Download QR Ticket'}
            </button>

            {onBackToKiosk && (
              <button type="button" className="btn-secondary" onClick={onBackToKiosk}>
                Back to Kiosk
              </button>
            )}
          </form>
        ) : (
          <div className="mobile-success">
            <h2>🎉 Registration Complete!</h2>
            <p className="ticket-code">Ticket Code: <strong>{submittedPlayer.qr_ticket_code}</strong></p>
            <p className="ticket-info">
              Your QR ticket has been downloaded. Present this code/QR to the game kiosk to start your 3 attempts!
            </p>
            <img
              src={getTicketDownloadUrl(submittedPlayer.id)}
              alt="Player QR Ticket"
              className="ticket-qr-img"
            />
            <p className="ticket-note">⚠️ Note: No QR Ticket, No Retry.</p>
            {onBackToKiosk && (
              <button type="button" className="btn-submit" onClick={onBackToKiosk}>
                Done / Back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
