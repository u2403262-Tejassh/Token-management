// Routes for managing organizer events (CRUD operations).
const express = require("express");
const Event = require("../models/Event");
const Token = require("../models/Token");

const router = express.Router();

function isMemoryMode() {
  return global.useMemoryStore === true;
}

// Create a new event for the logged-in organizer
router.post("/", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (isMemoryMode()) {
      const { store, generateId } = require("../memoryStore");
      const event = {
        _id: generateId(),
        title: title.trim(),
        owner: req.userId,
        lastTokenNumber: 0,
      };
      store.events.push(event);
      return res.status(201).json(event);
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
    if (isMemoryMode()) {
      const { store } = require("../memoryStore");
      const events = store.events.filter((e) => e.owner === req.userId);
      return res.status(200).json(events);
    }
    const events = await Event.find({ owner: req.userId });
    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching events" });
  }
});

// Get a single event by ID (only if owned by organizer)
router.get("/:id", async (req, res) => {
  try {
    if (isMemoryMode()) {
      const { store } = require("../memoryStore");
      const event = store.events.find((e) => e._id === req.params.id && e.owner === req.userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      return res.status(200).json(event);
    }
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

    if (isMemoryMode()) {
      const { store } = require("../memoryStore");
      const event = store.events.find((e) => e._id === req.params.id && e.owner === req.userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      event.title = title.trim();
      return res.status(200).json(event);
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
    if (isMemoryMode()) {
      const { store } = require("../memoryStore");
      const idx = store.events.findIndex((e) => e._id === req.params.id && e.owner === req.userId);
      if (idx === -1) {
        return res.status(404).json({ message: "Event not found" });
      }
      store.events.splice(idx, 1);
      // Delete all tokens belonging to this event
      store.tokens = store.tokens.filter((t) => t.event !== req.params.id && t.eventId !== req.params.id);
      // Need to reassign to store (since we filtered)
      const { store: s } = require("../memoryStore");
      s.tokens = store.tokens;
      return res.status(200).json({ message: "Event deleted" });
    }

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
