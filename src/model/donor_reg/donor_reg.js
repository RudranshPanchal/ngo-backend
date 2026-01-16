import mongoose from "mongoose";

const DonorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    organisationName: String,

    contactNumber: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    address: String,

    // ✅ VERIFICATION FLAGS (IMPORTANT)
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    panNumber: String,
    gstNumber: String,

    donationAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    modeofDonation: String,

    uploadPaymentProof: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    fundraisingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fundraising",
      default: null,
    },
  },
  { timestamps: true }
);
export default mongoose.model("Donor", DonorSchema, "donors");
// export default mongoose.model("Donor", DonorSchema);
