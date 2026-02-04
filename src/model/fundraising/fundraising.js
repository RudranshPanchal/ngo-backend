import mongoose from "mongoose";

const fundraisingSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
     userId: { type: mongoose.Schema.Types.ObjectId,
       ref: "User", 
       required: true },
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
      default: "active",
    },

    raisedAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("fundRaisingrout", fundraisingSchema);
