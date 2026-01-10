import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ["admin", "member", "donor", "volunteer"],
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // admin ke liye null
    },

    title: String,
    message: String,

    type: {
      type: String, // member-application, donation, approval, etc.
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
