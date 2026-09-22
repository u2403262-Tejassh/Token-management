// Client-side storage service: replaces MongoDB and Express backend with browser localStorage
// Provides instant persistence, zero database setup, and offline/static hosting support.

const USERS_KEY = "token_sys_users";
const EVENTS_KEY = "token_sys_events";
const TOKENS_KEY = "token_sys_tokens";
const SESSION_KEY = "token_sys_session";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// Seed initial demo data if localStorage is empty
const initializeStorage = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    const demoUser = {
      id: "demo_organizer_id",
      name: "Demo Organizer",
      email: "organizer@test.com",
      password: "password123",
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([demoUser]));

    const demoEvent = {
      _id: "demo_event_1",
      title: "Campus Tech Expo 2026",
      owner: demoUser.id,
      lastTokenNumber: 3,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(EVENTS_KEY, JSON.stringify([demoEvent]));

    const demoTokens = [
      {
        _id: "token_1",
        eventId: demoEvent._id,
        tokenNumber: 1,
        name: "Alice Smith",
        status: "done",
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        _id: "token_2",
        eventId: demoEvent._id,
        tokenNumber: 2,
        name: "Bob Johnson",
        status: "waiting",
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      },
      {
        _id: "token_3",
        eventId: demoEvent._id,
        tokenNumber: 3,
        name: "Charlie Brown",
        status: "waiting",
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
    ];
    localStorage.setItem(TOKENS_KEY, JSON.stringify(demoTokens));
  }
};

initializeStorage();

const getList = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
};

const setList = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const storage = {
  // --- AUTHENTICATION ---
  register: async (name, email, password) => {
    const users = getList(USERS_KEY);
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error("User already exists with this email");
    }
    const newUser = { id: generateId(), name, email, password };
    users.push(newUser);
    setList(USERS_KEY, users);
    return { message: "User registered successfully" };
  },

  login: async (email, password) => {
    const users = getList(USERS_KEY);
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      throw new Error("Invalid email or password");
    }
    const session = { userId: user.id, email: user.email, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { jwt: "local_jwt_" + user.id, user: session };
  },

  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("jwt");
  },

  // --- EVENTS ---
  getEvents: async () => {
    const session = storage.getCurrentUser();
    if (!session) throw new Error("Not authenticated");
    const events = getList(EVENTS_KEY);
    return events.filter((e) => e.owner === session.userId);
  },

  getEvent: async (id) => {
    const events = getList(EVENTS_KEY);
    const event = events.find((e) => e._id === id);
    if (!event) throw new Error("Event not found");
    return event;
  },

  getPublicEvent: async (id, titleFallback = "") => {
    const events = getList(EVENTS_KEY);
    const event = events.find((e) => e._id === id);
    if (event) return { title: event.title, _id: event._id };
    // If opened on another device with empty localStorage, use URL fallback title or default
    return { title: titleFallback || "Event Registration Queue", _id: id };
  },

  createEvent: async (title) => {
    const session = storage.getCurrentUser();
    if (!session) throw new Error("Not authenticated");
    const events = getList(EVENTS_KEY);
    const newEvent = {
      _id: generateId(),
      title,
      owner: session.userId,
      lastTokenNumber: 0,
      createdAt: new Date().toISOString(),
    };
    events.push(newEvent);
    setList(EVENTS_KEY, events);
    return newEvent;
  },

  updateEvent: async (id, title) => {
    const events = getList(EVENTS_KEY);
    const index = events.findIndex((e) => e._id === id);
    if (index === -1) throw new Error("Event not found");
    events[index].title = title;
    setList(EVENTS_KEY, events);
    return events[index];
  },

  deleteEvent: async (id) => {
    let events = getList(EVENTS_KEY);
    events = events.filter((e) => e._id !== id);
    setList(EVENTS_KEY, events);

    // Cascade delete tokens for this event
    let tokens = getList(TOKENS_KEY);
    tokens = tokens.filter((t) => t.eventId !== id);
    setList(TOKENS_KEY, tokens);

    return { message: "Event deleted successfully" };
  },

  // --- TOKENS ---
  getTokens: async (eventId) => {
    const tokens = getList(TOKENS_KEY);
    return tokens
      .filter((t) => t.eventId === eventId)
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  },

  joinEvent: async (eventId, attendeeName, titleFallback = "") => {
    const events = getList(EVENTS_KEY);
    let event = events.find((e) => e._id === eventId);

    // If event doesn't exist locally (e.g. attendee scanned on phone), auto-register event placeholder
    if (!event) {
      event = {
        _id: eventId,
        title: titleFallback || "Queue Event",
        owner: "organizer",
        lastTokenNumber: 0,
        createdAt: new Date().toISOString(),
      };
      events.push(event);
    }

    event.lastTokenNumber = (event.lastTokenNumber || 0) + 1;
    setList(EVENTS_KEY, events);

    const tokens = getList(TOKENS_KEY);
    const newToken = {
      _id: generateId(),
      eventId,
      tokenNumber: event.lastTokenNumber,
      name: attendeeName,
      status: "waiting",
      createdAt: new Date().toISOString(),
    };

    tokens.push(newToken);
    setList(TOKENS_KEY, tokens);

    return newToken;
  },

  markTokenDone: async (tokenId) => {
    const tokens = getList(TOKENS_KEY);
    const index = tokens.findIndex((t) => t._id === tokenId);
    if (index === -1) throw new Error("Token not found");
    tokens[index].status = "done";
    setList(TOKENS_KEY, tokens);
    return tokens[index];
  },
};
