// Public routes for attendees to view event info and join the queue.
const express = require("express");
const Event = require("../models/Event");
const Token = require("../models/Token");

const router = express.Router();

// Get public event details (title only) by event ID
router.get("/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.status(200).json({ title: event.title });
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching event" });
  }
});

// Join an event queue by incrementing lastTokenNumber and creating a token
router.post("/events/:id/join", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Atomically increment lastTokenNumber so concurrent joins receive unique numbers
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $inc: { lastTokenNumber: 1 } },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const token = new Token({
      event: event._id,
      tokenNumber: event.lastTokenNumber,
      name: name.trim(),
      status: "waiting",
    });

    await token.save();
    return res.status(201).json(token);
  } catch (err) {
    return res.status(500).json({ message: "Server error joining queue" });
  }
});

module.exports = router;
