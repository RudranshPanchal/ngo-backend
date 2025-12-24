import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  gender: { type: String, required: true },
  age: { type: Number, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  area: { type: String },
  state: { type: String },
  pinCode: { type: String },
  typesOfSupport: [{
    type: String,
    enum: ["training", "education", "health", "livelihood"]
  }],
  governmentIdProof: { type: String },
  specialRequirement: { type: String },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  approvedAt: { type: Date },
  memberId: {
    type: String,
    unique: true,
    default: () => `MEM${Date.now()}`
  }
}, { timestamps: true });

export default mongoose.model("Member", memberSchema);