// Main Express server file: connects to MongoDB Atlas and mounts API routes.
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const publicRoutes = require("./routes/public");
const eventRoutes = require("./routes/events");
const tokenRoutes = require("./routes/tokens");
const authMiddleware = require("./middleware/auth");

// Default JWT secret for the college demo if not set in .env (production should set a strong one)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "college_viva_secret_2026_token_system_jwt";
}

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all origins (needed when the deployed frontend calls the API)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({
    status: "ok",
    db: state === 1 ? "connected" : "disconnected",
  });
});

// Public routes (no login required)
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

// Protected routes (login required via auth middleware)
app.use("/api/events", authMiddleware, eventRoutes);
app.use("/api/tokens", authMiddleware, tokenRoutes);

// Reusable MongoDB Atlas connection (cached across Vercel serverless invocations)
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI not set - add it to Vercel Env Vars (or server/.env locally)");
  }

  try {
    // Pure Atlas connection - no fallbacks. If this fails, the error surfaces as a 500.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB Atlas");

    // Seed demo data on first connect if the database is empty.
    // Needed for the viva demo account - this is seeding, NOT a fallback.
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
  } catch (err) {
    console.error("MongoDB Atlas connection failed:", err.message);
    // No memory/local fallback - throw so Vercel returns 500 and the env var issue is visible
    throw err;
  }
};

// Start standalone server when executed directly (e.g. node server.js / npm run dev)
const startServer = async () => {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Server startup failed:", err.message);
    process.exit(1);
  });
}

module.exports = { app, connectDB };
