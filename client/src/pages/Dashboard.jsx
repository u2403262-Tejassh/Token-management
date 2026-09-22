// Dashboard page: displays organizer events with create, edit, delete, and manage actions.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../services/storage";

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch all events belonging to the logged-in organizer
  const loadEvents = async () => {
    if (!storage.getCurrentUser()) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await storage.getEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Create a new event with the entered title
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    try {
      await storage.createEvent(title.trim());
      setTitle("");
      loadEvents();
    } catch (err) {
      setError(err.message || "Failed to create event");
    }
  };

  // Prompt user for new title and update event
  const handleEdit = async (event) => {
    const newTitle = window.prompt("Enter new title:", event.title);
    if (!newTitle || newTitle.trim() === event.title) return;
    try {
      await storage.updateEvent(event._id, newTitle.trim());
      loadEvents();
    } catch (err) {
      setError(err.message || "Failed to update event");
    }
  };

  // Confirm and delete event and its tokens
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await storage.deleteEvent(id);
      loadEvents();
    } catch (err) {
      setError(err.message || "Failed to delete event");
    }
  };

  // Log out by clearing session
  const handleLogout = () => {
    storage.logout();
    navigate("/login");
  };

  return (
    <div className="container">
      <div className="header-bar">
        <h2>Organizer Dashboard</h2>
        <button onClick={handleLogout} className="secondary">Logout</button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="loading-text">Loading...</p>}

      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New Event Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button type="submit">Create Event</button>
      </form>

      <h3>My Events</h3>
      {events.length === 0 && !loading && <p style={{ textAlign: "center" }}>No events yet.</p>}

      {events.map((event) => (
        <div key={event._id} className="event-card">
          <span><strong>{event.title}</strong></span>
          <div className="button-group">
            <button onClick={() => navigate(`/events/${event._id}`)}>Manage</button>
            <button onClick={() => handleEdit(event)} className="secondary">Edit</button>
            <button onClick={() => handleDelete(event._id)} className="danger">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
