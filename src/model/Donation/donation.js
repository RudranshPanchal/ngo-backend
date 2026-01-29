import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Make optional for anonymous donations
    },
    
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    
    modeofDonation: {
        type: String,
        enum: ["bankTransfer", "upi", "cash", "cheque", "card", "netbanking"],
        default: "bankTransfer"
    },
    address: { 
        type: String, 
        default: "N/A" 
    },
    purposeOfDonation: { 
        type: String, 
        default: "General Donation" 
    },
    // Razorpay payment details
    razorpayPaymentId: {
        type: String,
        required: false
    },
    
    razorpayOrderId: {
        type: String,
        required: false
    },
    razorpaySignature: {
        type: String,
        required: false
    },
    panNumber: { type: String, default: "N/A" },
    // Payment status
    paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending"
    },
    
    // Donor details
    donorName: {
        type: String,
        required: true
    },
    receiptNo: { 
        type: String, 
        unique: true // Isse har ID unique rahegi
    },
    receiptUrl: { type: String, default: "" },
    
    donorEmail: {
        type: String,
        required: true
    },
    donorPhone: {
        type: String,
        required: true
    },
fundraisingId: { type: mongoose.Schema.Types.ObjectId, ref: "Fundraising" },    
}, { timestamps: true });

const Donation = mongoose.model("Donation", donationSchema);

export default Donation;
