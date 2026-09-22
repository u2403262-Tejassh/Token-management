// Simple in-memory fallback store when Atlas and mongodb-memory-server are unavailable
// Used for sandbox testing where outbound MongoDB connections are blocked
// In production (Vercel + Atlas) this is never used - mongoose handles everything

const store = {
  users: [],
  events: [],
  tokens: [],
};

// Seed demo data (same as old localStorage demo)
function seedIfEmpty() {
  if (store.users.length === 0) {
    const bcrypt = require("bcryptjs");
    const hashed = bcrypt.hashSync("password123", 10);
    store.users.push({
      _id: "demo_organizer_id",
      id: "demo_organizer_id",
      name: "Demo Organizer",
      email: "organizer@test.com",
      password: hashed,
    });

    const demoEvent = {
      _id: "demo_event_1",
      title: "Campus Tech Expo 2026",
      owner: "demo_organizer_id",
      lastTokenNumber: 3,
    };
    store.events.push(demoEvent);

    store.tokens.push(
      {
        _id: "token_1",
        event: "demo_event_1",
        eventId: "demo_event_1",
        tokenNumber: 1,
        name: "Alice Smith",
        status: "done",
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        _id: "token_2",
        event: "demo_event_1",
        eventId: "demo_event_1",
        tokenNumber: 2,
        name: "Bob Johnson",
        status: "waiting",
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      },
      {
        _id: "token_3",
        event: "demo_event_1",
        eventId: "demo_event_1",
        tokenNumber: 3,
        name: "Charlie Brown",
        status: "waiting",
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      }
    );
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

module.exports = { store, seedIfEmpty, generateId };
