// Main Express server file: connects to MongoDB and mounts API routes.
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const publicRoutes = require("./routes/public");
const eventRoutes = require("./routes/events");
const tokenRoutes = require("./routes/tokens");
const authMiddleware = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/token_system";

// Parse incoming JSON request bodies
app.use(express.json());

// Public routes (no login required)
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

// Protected routes (login required via auth middleware)
app.use("/api/events", authMiddleware, eventRoutes);
app.use("/api/tokens", authMiddleware, tokenRoutes);

// Reusable database connection with serverless connection pooling
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  let uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/token_system";
  try {
    // Try connecting to configured MongoDB (e.g. MongoDB Atlas in production or local daemon)
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log("Connected to MongoDB successfully at:", uri);
  } catch (err) {
    // In Vercel serverless environment, throw error so organizer knows to configure Atlas
    if (process.env.VERCEL) {
      console.error("Vercel Serverless: MongoDB connection failed. Please check MONGO_URI in environment variables:", err.message);
      throw err;
    }
    console.log("Local MongoDB not reachable, launching embedded database...");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log("Connected to embedded MongoDB successfully at:", uri);
  }
};

// Start standalone server when executed directly (e.g., node server.js)
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Server startup failed:", err.message);
  });
}

module.exports = { app, connectDB };

