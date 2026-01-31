import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: String,
    email: String,
    mobile: String,
    role: String,
     
    campaignTitle: String,
    campaignType: String,
    shortDescription: String,
    detailedStory: String,

    beneficiaryName: String,
    beneficiaryGender: String,
    city: String,
    state: String,

    targetAmount: Number,
    minDonation: Number,
    startDate: Date,
    endDate: Date,

    beneficiaryPhoto: String,
    documents: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminRemark: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);
