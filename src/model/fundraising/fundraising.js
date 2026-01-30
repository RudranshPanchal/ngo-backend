// import mongoose from "mongoose";
// const fundraisingSchema = new mongoose.Schema({
//   name: String,
//   city: String,
// payment: { type: Number, default: 0 },
//   image: String,
//   description: String,
//   limit:Number,
//   tags: [String],
  
// });

// export default mongoose.model("fundRaisingrout ", fundraisingSchema);
// model/fundraising/fundraising.js
// model/fundraising/fundraising.js
import mongoose from "mongoose";

const fundraisingSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },

    // 🔥 FULL CAMPAIGN DATA (COPY)
    fullName: String,
    email: String,
    mobile: String,

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
