// Application routing file: defines URL paths and maps them to page components.
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ManageEvent from "./pages/ManageEvent";
import JoinEvent from "./pages/JoinEvent";

function App() {
  return (
    <Routes>
      {/* Redirect root URL to the dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/events/:id" element={<ManageEvent />} />
      <Route path="/join/:id" element={<JoinEvent />} />
    </Routes>
  );
}

export default App;
