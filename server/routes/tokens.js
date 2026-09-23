// Routes for managing tokens within an event.
const express = require("express");
const Token = require("../models/Token");

const router = express.Router();

// Get all tokens for an event, sorted by tokenNumber ascending (arrival order)
router.get("/", async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ message: "eventId query parameter is required" });
    }

    const tokens = await Token.find({ event: eventId }).sort({ tokenNumber: 1 });
    return res.status(200).json(tokens);
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching tokens" });
  }
});

// Update a token's status (must be "waiting" or "done")
router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== "waiting" && status !== "done") {
      return res.status(400).json({ message: "Status must be 'waiting' or 'done'" });
    }

    const token = await Token.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!token) {
      return res.status(404).json({ message: "Token not found" });
    }

    return res.status(200).json(token);
  } catch (err) {
    return res.status(500).json({ message: "Server error updating token" });
  }
});

module.exports = router;
