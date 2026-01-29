import mongoose from "mongoose";

const volunteerSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: Date },
    contactNumber: { type: String, required: true },
    email: {
        type: String, required: true, unique: true, lowercase: true,
        trim: true
    },
    profilePhoto: {
        type: String,
        default: null,
    },
    userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    address: { type: String },
    skills: { type: [String] },
    profession: { type: String },
    areaOfVolunteering: {
        type: String,
        enum: ["fieldWork", "online", "fundraising", "training"],
        required: true
    },
    availability: {
        type: String,
        enum: ["morning", "afternoon", "evening", "weekend"],
        required: true
    },
    emergencyContactNumber: { type: String, required: true },
    uploadIdProof: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    volunteerId: { type: String, unique: true, index: true },
    // Nayi fields verification track karne ke liye
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },

}, { timestamps: true });

export default mongoose.model("Volunteer", volunteerSchema);