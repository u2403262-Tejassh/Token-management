// Event data model representing an event or queue created by an organizer.
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  lastTokenNumber: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Event", eventSchema);
