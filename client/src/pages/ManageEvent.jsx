// ManageEvent page: shows QR code, shareable link, token list, walk-in form, and mark-done actions.
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { storage } from "../services/storage";

function ManageEvent() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [attendeeName, setAttendeeName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const joinUrl = event
    ? `${window.location.origin}/join/${id}?title=${encodeURIComponent(event.title)}`
    : `${window.location.origin}/join/${id}`;

  // Fetch event details and its tokens
  const loadData = async () => {
    if (!storage.getCurrentUser()) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const eventData = await storage.getEvent(id);
      setEvent(eventData);

      const tokensData = await storage.getTokens(id);
      setTokens(tokensData);
    } catch (err) {
      setError(err.message || "Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Add walk-in attendee directly from manage screen
  const handleAddAttendee = async (e) => {
    e.preventDefault();
    if (!attendeeName.trim()) return;
    try {
      await storage.joinEvent(id, attendeeName.trim(), event ? event.title : "");
      setAttendeeName("");
      loadData();
    } catch (err) {
      setError(err.message || "Failed to add attendee");
    }
  };

  // Mark a waiting token as done
  const handleMarkDone = async (tokenId) => {
    try {
      await storage.markTokenDone(tokenId);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to update token");
    }
  };

  return (
    <div className="container">
      <Link to="/dashboard" className="link-text">← Back to Dashboard</Link>
      <h2>{event ? event.title : "Event Details"}</h2>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="loading-text">Loading...</p>}

      <div className="qr-box">
        <p><strong>Scan QR to join queue:</strong></p>
        <QRCodeSVG value={joinUrl} size={160} />
        <a href={joinUrl} target="_blank" rel="noreferrer" className="link-text">{joinUrl}</a>
      </div>

      <div className="walkin-section" style={{ margin: "20px 0", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
        <h4>Issue Token / Add Walk-in Attendee</h4>
        <form onSubmit={handleAddAttendee} style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Attendee Name"
            value={attendeeName}
            onChange={(e) => setAttendeeName(e.target.value)}
            required
            style={{ margin: 0 }}
          />
          <button type="submit" style={{ whiteSpace: "nowrap" }}>Issue Token</button>
        </form>
      </div>

      <div className="header-bar">
        <p><strong>Total people in queue: {tokens.length}</strong></p>
        <button onClick={loadData} className="secondary">Refresh</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Token #</th>
            <th>Name</th>
            <th>Time</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t._id}>
              <td><strong>#{t.tokenNumber}</strong></td>
              <td>{t.name}</td>
              <td>{new Date(t.createdAt).toLocaleTimeString()}</td>
              <td>{t.status}</td>
              <td>
                {t.status === "waiting" ? (
                  <button onClick={() => handleMarkDone(t._id)} className="success">Mark Done</button>
                ) : (
                  <span>Done</span>
                )}
              </td>
            </tr>
          ))}
          {tokens.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center" }}>No attendees yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ManageEvent;
