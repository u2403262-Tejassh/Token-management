// API service: connects React frontend to Express + MongoDB Atlas backend
// Replaces localStorage mock with real REST calls via /api

const API_BASE = ""; // relative - Vite proxy handles /api -> localhost:4000 in dev, Vercel rewrites in prod

function getJwt() {
  return localStorage.getItem("jwt");
}

// Decode JWT payload without verification (just to get userId for UI)
function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  // Attach JWT if available and not already set
  const jwt = getJwt();
  if (jwt && !headers.Authorization) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const storage = {
  // --- AUTHENTICATION ---
  register: async (name, email, password) => {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  login: async (email, password) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Server returns { jwt }
    if (data.jwt) {
      localStorage.setItem("jwt", data.jwt);
      // Also store a session for getCurrentUser compatibility
      const payload = decodeJwtPayload(data.jwt);
      if (payload) {
        localStorage.setItem("token_sys_session", JSON.stringify({ userId: payload.userId, email }));
      }
    }
    return data;
  },

  getCurrentUser: () => {
    const jwt = getJwt();
    if (!jwt) return null;
    // Try to return decoded session if available
    try {
      const session = localStorage.getItem("token_sys_session");
      if (session) return JSON.parse(session);
    } catch {}
    const payload = decodeJwtPayload(jwt);
    if (payload) return { userId: payload.userId, jwt };
    // Fallback: jwt exists means logged in
    return { jwt };
  },

  logout: () => {
    localStorage.removeItem("token_sys_session");
    localStorage.removeItem("jwt");
    // Cleanup old localStorage keys from previous mock implementation
    localStorage.removeItem("token_sys_users");
    localStorage.removeItem("token_sys_events");
    localStorage.removeItem("token_sys_tokens");
  },

  // --- EVENTS ---
  getEvents: async () => {
    return apiFetch("/api/events", { method: "GET" });
  },

  getEvent: async (id) => {
    return apiFetch(`/api/events/${id}`, { method: "GET" });
  },

  getPublicEvent: async (id, titleFallback = "") => {
    try {
      const data = await fetch(`${API_BASE}/api/public/events/${id}`).then(async (res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      });
      return data;
    } catch (err) {
      // Fallback for offline or if opened on device before event synced
      if (titleFallback) return { title: titleFallback, _id: id };
      throw err;
    }
  },

  createEvent: async (title) => {
    return apiFetch("/api/events", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  },

  updateEvent: async (id, title) => {
    return apiFetch(`/api/events/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  },

  deleteEvent: async (id) => {
    return apiFetch(`/api/events/${id}`, { method: "DELETE" });
  },

  // --- TOKENS ---
  getTokens: async (eventId) => {
    return apiFetch(`/api/tokens?eventId=${encodeURIComponent(eventId)}`, {
      method: "GET",
    });
  },

  joinEvent: async (eventId, attendeeName, titleFallback = "") => {
    // Public join - no auth header needed (apiFetch will add it if exists, server ignores)
    // Use raw fetch to avoid sending stale jwt if attendee is not organizer
    const res = await fetch(`${API_BASE}/api/public/events/${eventId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: attendeeName }),
    });
    let data;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }
    if (!res.ok) throw new Error(data.message || `Join failed (${res.status})`);
    return data;
  },

  markTokenDone: async (tokenId) => {
    return apiFetch(`/api/tokens/${tokenId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "done" }),
    });
  },
};
