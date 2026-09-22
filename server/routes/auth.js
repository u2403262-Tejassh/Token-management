// Routes for user registration and login authentication.
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "college_viva_secret_2026_token_system_jwt";
}

const router = express.Router();

// Helper to check if we are in memory fallback mode
function isMemoryMode() {
  return global.useMemoryStore === true;
}

// Register a new user account
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (isMemoryMode()) {
      const { store, generateId } = require("../memoryStore");
      const existingUser = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "Email is already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { _id: generateId(), id: generateId(), name, email, password: hashedPassword };
      // Ensure _id is consistent
      newUser.id = newUser._id;
      store.users.push(newUser);
      return res.status(201).json({ message: "User registered successfully" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Server error during registration" });
  }
});

// Log in an existing user and return a JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (isMemoryMode()) {
      const { store } = require("../memoryStore");
      const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const jwtString = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
      return res.status(200).json({ jwt: jwtString });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const jwtString = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.status(200).json({ jwt: jwtString });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server error during login" });
  }
});

module.exports = router;
