import mongoose from "mongoose";

const phoneOtpSchema = new mongoose.Schema({
  contactNumber: String,
  otp: String,
  expiresAt: Date,
  verified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("PhoneOtp", phoneOtpSchema);
