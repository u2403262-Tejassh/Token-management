// Routes for managing organizer events (CRUD operations).
const express = require("express");
const Event = require("../models/Event");
const Token = require("../models/Token");

const router = express.Router();

// Create a new event for the logged-in organizer
router.post("/", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const event = new Event({
      title: title.trim(),
      owner: req.userId,
    });
    await event.save();

    return res.status(201).json(event);
  } catch (err) {
    return res.status(500).json({ message: "Server error creating event" });
  }
});

// Get all events owned by the logged-in organizer
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({ owner: req.userId });
    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching events" });
  }
});

// Get a single event by ID (only if owned by organizer)
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, owner: req.userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.status(200).json(event);
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching event" });
  }
});

// Update an event's title (only if owned by organizer)
router.put("/:id", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { title: title.trim() },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(event);
  } catch (err) {
    return res.status(500).json({ message: "Server error updating event" });
  }
});

// Delete an event and all its associated tokens
router.delete("/:id", async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Delete all tokens belonging to this event
    await Token.deleteMany({ event: req.params.id });

    return res.status(200).json({ message: "Event deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error deleting event" });
  }
});

module.exports = router;
