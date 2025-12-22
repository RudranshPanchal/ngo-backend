import mongoose from "mongoose";

const beneficiarySchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: String, required: true },
    contactNumber: { type: String, required: true },
    address: { type: String, required: true },
    familyDetails: { type: String },
    typesOfSupport: [{ 
        type: String, 
        enum: ["training", "education", "health", "livelihood"] 
    }],
    governmentId: { type: String },
    specialRequirement: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    beneficiaryId: { type: String, unique: true }
}, { timestamps: true });

beneficiarySchema.pre('save', async function(next) {
    if (!this.beneficiaryId) {
        const count = await mongoose.model('Beneficiary').countDocuments();
        this.beneficiaryId = `BEN${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

export default mongoose.model("Beneficiary", beneficiarySchema);