import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    gender: { type: String, required: true },
    age: { type: Number, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    area: { type: String },
    state: { type: String },
    pinCode: { type: String },
    typesOfSupport: [
      {
        type: String,
        enum: ["training", "education", "health", "livelihood"],
      },
    ],
    profilePhoto: {
      type: String,
      required: true,
    },
    governmentIdProof: { type: String },
    specialRequirement: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "blocked"],
      default: "pending",
    },
    appointmentLetterIssued: {
      type: Boolean,
      default: false,
    },
    appointmentLetterUrl: {
      type: String,
    },
    appointmentLetterPDF: { type: Buffer }, // Store PDF binary
    appointmentLetterDate: {
      type: Date,
    },
    idCardCloudinaryUrl: { type: String },
    appointmentLetterCloudinaryUrl: { type: String },
    membershipCertificateCloudinaryUrl: { type: String },

    idCardPDF: { type: Buffer },
    appointmentLetterPDF: { type: Buffer },
    membershipCertificatePDF: { type: Buffer },
    // ================= CERTIFICATE FIELDS =================
    membershipCertificateIssued: { type: Boolean, default: false },
    membershipCertificatePDF: { type: Buffer }, // Store PDF binary
    membershipCertificateDate: { type: Date },

    approvedAt: { type: Date },
    memberId: {
      type: String,
      unique: true,
      default: () => `MEM${Date.now()}`,
    },

    // ================= ID CARD FIELDS =================
    idCardIssued: {
      type: Boolean,
      default: false,
    },
    idCardIssueDate: {
      type: Date,
    },
    idCardUrl: {
      type: String, // /uploads/id-cards/ID_xxx.pdf
    },
  },
  { timestamps: true },
);

export default mongoose.model("Member", memberSchema);
