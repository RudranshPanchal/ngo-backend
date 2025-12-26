import mongoose from "mongoose";

const signupOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
  },
  role:{
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.model("SignupOtp", signupOtpSchema);
