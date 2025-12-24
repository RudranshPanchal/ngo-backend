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
        enum: ["bankTransfer", "upi", "cash", "cheque"],
        default: "bankTransfer"
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
