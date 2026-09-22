import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { storage } from "../services/storage";

function Login() {
  const [email, setEmail] = useState("organizer@test.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Send login request with email and password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await storage.login(email, password);
      // Store session and open dashboard
      localStorage.setItem("jwt", data.jwt);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Organizer Login</h2>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="loading-text">Loading...</p>}

      <form onSubmit={handleSubmit}>
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
          Log In
        </button>
      </form>

      <p style={{ textAlign: "center" }}>
        Need an account? <Link to="/register" className="link-text">Register here</Link>
      </p>
    </div>
  );
}

export default Login;
