import mongoose from "mongoose";

const fundraiserSchema = new mongoose.Schema(
  {
    // Organizer
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true }, // later hash

    // Campaign
    campaignTitle: { type: String, required: true },
    campaignType: { type: String, required: true },
    shortDescription: { type: String, required: true },
    detailedStory: { type: String, required: true },

    // Beneficiary
    beneficiaryName: { type: String, required: true },
    beneficiaryGender: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },

    // Finance
    targetAmount: { type: Number, required: true },
    minDonation: { type: Number },

    // Timeline
    startDate: Date,
    endDate: Date,

    // Documents
    beneficiaryPhoto: { type: String }, // Cloudinary URL
    documents: { type: String },

    // Admin Flow
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    adminRemark: String,
  },
  { timestamps: true }
);

export default mongoose.model(
  "Fundraiser",
  fundraiserSchema
);
