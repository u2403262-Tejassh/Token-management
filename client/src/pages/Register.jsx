// Register page: allows new organizers to sign up and redirects to login.
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { storage } from "../services/storage";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Send registration request with name, email, and password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await storage.register(name, email, password);
      // Registration successful, navigate to login
      navigate("/login");
    } catch (err) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Organizer Register</h2>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="loading-text">Loading...</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          Register
        </button>
      </form>

      <p style={{ textAlign: "center" }}>
        Already have an account? <Link to="/login" className="link-text">Login here</Link>
      </p>
    </div>
  );
}

export default Register;
