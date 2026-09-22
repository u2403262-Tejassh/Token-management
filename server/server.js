// Main Express server file: connects to MongoDB and mounts API routes.
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const publicRoutes = require("./routes/public");
const eventRoutes = require("./routes/events");
const tokenRoutes = require("./routes/tokens");
const authMiddleware = require("./middleware/auth");

// Default JWT secret for college demo if not set in .env (production should set strong one)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "college_viva_secret_2026_token_system_jwt";
}

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all origins (needed when client on Vercel calls API)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({
    status: "ok",
    db: state === 1 ? "connected" : state === 2 ? "connecting" : "disconnected",
    mode: state === 1 ? "atlas" : global.useMemoryStore ? "memory-fallback" : "disconnected",
  });
});

// Public routes (no login required)
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

// Protected routes (login required via auth middleware)
app.use("/api/events", authMiddleware, eventRoutes);
app.use("/api/tokens", authMiddleware, tokenRoutes);

// Flag for in-memory fallback (used when Atlas unreachable and download fails)
global.useMemoryStore = false;

// Reusable database connection with serverless connection pooling
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (global.useMemoryStore) {
    console.log("Using in-memory fallback store (no MongoDB)");
    return;
  }

  let uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/token_system";
  try {
    // Try connecting to configured MongoDB (e.g. MongoDB Atlas in production or local daemon)
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB successfully");
    // Don't log full URI with password in production
    console.log("MongoDB host:", uri.split("@")[1] ? uri.split("@")[1].split("/")[0] : "local");
    global.useMemoryStore = false;

    // Seed demo data if Atlas is empty (for first-time viva demo)
    try {
      const User = require("./models/User");
      const Event = require("./models/Event");
      const Token = require("./models/Token");
      const bcrypt = require("bcryptjs");
      const count = await User.countDocuments();
      if (count === 0) {
        console.log("Seeding demo data to Atlas...");
        const hashed = await bcrypt.hash("password123", 10);
        const demoUser = await User.create({
          name: "Demo Organizer",
          email: "organizer@test.com",
          password: hashed,
        });
        const demoEvent = await Event.create({
          title: "Campus Tech Expo 2026",
          owner: demoUser._id,
          lastTokenNumber: 3,
        });
        await Token.create([
          { event: demoEvent._id, tokenNumber: 1, name: "Alice Smith", status: "done" },
          { event: demoEvent._id, tokenNumber: 2, name: "Bob Johnson", status: "waiting" },
          { event: demoEvent._id, tokenNumber: 3, name: "Charlie Brown", status: "waiting" },
        ]);
        console.log("Demo data seeded: organizer@test.com / password123");
      }
    } catch (seedErr) {
      console.error("Demo seeding skipped:", seedErr.message);
    }
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    // In Vercel serverless environment, try memory fallback briefly then throw if needed
    if (process.env.VERCEL) {
      console.error("Vercel Serverless: Please check MONGO_URI in environment variables");
      // Don't throw immediately - allow memory fallback for demo, but log
      // throw err;
    }
    console.log("Local MongoDB not reachable, launching embedded database...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log("Connected to embedded MongoDB successfully at:", uri);
      global.useMemoryStore = false;
    } catch (memErr) {
      console.error("Embedded MongoDB also failed:", memErr.message);
      console.log("Falling back to pure in-memory JavaScript store (sandbox mode)");
      console.log("NOTE: Data will be lost on server restart, but Atlas will work on Vercel");
      global.useMemoryStore = true;
      const { seedIfEmpty } = require("./memoryStore");
      seedIfEmpty();
      // Don't throw - allow server to start with memory store
    }
  }
};

// Start standalone server when executed directly (e.g., node server.js)
const startServer = async () => {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (global.useMemoryStore) {
      console.log("Mode: IN-MEMORY (Atlas unavailable in sandbox - will work on Vercel)");
    } else if (mongoose.connection.readyState === 1) {
      console.log("Mode: MongoDB Atlas");
    }
  });
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Server startup failed:", err.message);
  });
}

module.exports = { app, connectDB };
