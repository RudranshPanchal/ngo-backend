import mongoose from "mongoose";
import Counter from "../counter.js";

const volunteerSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: Date },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: { type: String },
    skills: { type: String },
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
    volunteerId: { type: String, unique: true },

    password: { type: String },
    tempPassword: { type: Boolean, default: true }
}, { timestamps: true });

volunteerSchema.pre("save", async function (next) {
    if (!this.isNew || this.volunteerId) return next();

    try {
        const counterDoc = await Counter.findOneAndUpdate(
            { name: "volunteerId" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        this.volunteerId = `VOL${String(counterDoc.seq).padStart(4, "0")}`;
        next();
    } catch (err) {
        next(err);
    }
});

export default mongoose.model("Volunteer", volunteerSchema);
