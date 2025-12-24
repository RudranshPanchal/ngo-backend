import mongoose from "mongoose";

const DonorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: { type: String },
    organisationName: { type: String },
    contactNumber: { type: String },
    address: { type: String },
    email: { type: String },
    panNumber: { type: String },
    gstNumber: { type: String },
    modeofDonation: { type: String },
    donationAmount: { type: Number, default: 0 },
    donationFrequency: { type: String },
    consentForUpdate: { type: String },
    uploadPaymentProof: { type: String },
    fundraisingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fundraising",
      required: false,
    },
  },
  {
    timestamps: true, 
  }
);

const DonationReg = mongoose.model("Donor", DonorSchema);
export default DonationReg;
