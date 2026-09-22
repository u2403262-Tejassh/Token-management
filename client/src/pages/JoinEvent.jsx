// JoinEvent public page: allows attendees to enter their name and receive a token number.
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { storage } from "../services/storage";

function JoinEvent() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const urlTitle = searchParams.get("title");

  const [title, setTitle] = useState(urlTitle || "");
  const [name, setName] = useState("");
  const [myToken, setMyToken] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch public event title (from storage or URL fallback)
  const loadEvent = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await storage.getPublicEvent(id, urlTitle);
      setTitle(data.title);
    } catch (err) {
      setError(err.message || "Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id, urlTitle]);

  // Request a token by submitting attendee name
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    try {
      const data = await storage.joinEvent(id, name.trim(), title || urlTitle);
      setMyToken(data);
    } catch (err) {
      setError(err.message || "Failed to get token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>{title ? title : "Queue Registration"}</h2>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="loading-text">Loading...</p>}

      {myToken ? (
        <div className="token-badge">
          <p>Your Token Number</p>
          <div className="number">#{myToken.tokenNumber}</div>
          <p>Name: <strong>{myToken.name}</strong></p>
          <p>Status: <strong>{myToken.status}</strong></p>
          <p style={{ fontSize: "13px", color: "#666" }}>Please wait until your number is called.</p>
        </div>
      ) : (
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            Get My Token
          </button>
        </form>
      )}
    </div>
  );
}

export default JoinEvent;
