import mongoose from "mongoose";

const eventCertificateSchema = new mongoose.Schema({
    certificateId: { type: String, required: true, unique: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientName: { type: String, required: true },
    role: { type: String, default: "volunteer" },

    // Snapshot of work done for this event
    hoursCredited: { type: Number, required: true },
    tasksCompleted: { type: Number, required: true },

    issueDate: { type: Date, default: Date.now },
    url: { type: String, required: true }, // Cloudinary PDF URL
    publicId: { type: String }, // For deleting from cloud if needed
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin ID
}, { timestamps: true });

export default mongoose.model("EventCertificate", eventCertificateSchema);
