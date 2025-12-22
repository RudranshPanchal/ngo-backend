import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
    recipientName: { type: String, required: true },
    email: {  type: String,  required: true},
    issueDate: { type: String, required: true },
    description: { type: String },
    status: {type: String,enum: ["Pending", "Issued"],default: "Pending",},
    role: { type: String, enum: ["donor", "volunteer"], required: true },
    qrCode: { type: String }
}, { timestamps: true });

export default mongoose.model("Certificate", certificateSchema);
