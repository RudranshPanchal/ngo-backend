import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    category: {
      type: String,
      enum: ["Workshop", "Fair", "Training", "Health", "Fundraising", "Seminar", "Other"],
      required: true
    },

    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled"],
      default: "upcoming"
    },

    eventDate: { type: Date, required: true },
    startTime: String,
    endTime: String,

    location: {
      venue: String,
      area: String,
      city: String
    },

    organizerName: String,

    registrationDeadline: Date,

    isRegistrationOpen: {
      type: Boolean,
      default: true
    },

    requirements: [String],

    maxParticipants: { type: Number, required: true },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: []
    },
    currentParticipants: {
      type: Number,
      default: 0
    },

    isDeleted: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
