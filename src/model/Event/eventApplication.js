import mongoose from "mongoose";

const eventApplicationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      required: true
    },

    status: {
      type: String,
      enum: ["applied", "registered", "attended", "cancelled", "rejected"],
      default: "applied"
    },

    appliedAt: {
      type: Date,
      default: Date.now
    },

    attendedAt: Date,
    cancelledAt: Date
  },
  { timestamps: true }
);

// Prevent duplicate applications
eventApplicationSchema.index(
  { eventId: 1, volunteerId: 1 },
  { unique: true }
);

const EventApplication = mongoose.model(
  "EventApplication",
  eventApplicationSchema
);

export default EventApplication;
