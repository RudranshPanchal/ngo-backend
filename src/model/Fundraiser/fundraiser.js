// import mongoose from "mongoose";

// const fundraiserSchema = new mongoose.Schema(
//   {
//     // Organizer
//     fullName: { type: String, required: true },
//     email: { type: String, required: true },
//     mobile: { type: String, required: true },
//     password: { type: String, required: true }, // later hash

//     // Campaign
//     campaignTitle: { type: String, required: true },
//     campaignType: { type: String, required: true },
//     shortDescription: { type: String, required: true },
//     detailedStory: { type: String, required: true },

//     // Beneficiary
//     beneficiaryName: { type: String, required: true },
//     beneficiaryGender: { type: String, required: true },
//     city: { type: String, required: true },
//     state: { type: String, required: true },

//     // Finance
//     targetAmount: { type: Number, required: true },
//     minDonation: { type: Number },

//     // Timeline
//     startDate: Date,
//     endDate: Date,

//     // Documents
//     beneficiaryPhoto: { type: String }, // Cloudinary URL
//     documents: { type: String },

//     // Admin Flow
//     status: {
//       type: String,
//       enum: ["PENDING", "APPROVED", "REJECTED"],
//       default: "PENDING",
//     },

//     adminRemark: String,
//   },
//   { timestamps: true }
// );

// export default mongoose.model(
//   "Fundraiser",
//   fundraiserSchema
// );
import mongoose from "mongoose";

const fundraiserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    fundraiserType: {
      type: String,
      enum: ["medical", "education", "emergency", "other"],
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    // Verification Flags
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Documents (URLs from Cloudinary)
    aadharCard: {
      type: String,
    },
    panCard: {
      type: String,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Fundraiser", fundraiserSchema);
