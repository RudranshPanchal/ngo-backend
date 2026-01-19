import fs from "fs";
import path from "path";
import Donation from "../../model/Donation/donation.js";
import User from "../../model/Auth/auth.js";
// import { sendReceiptEmail } from "../../utils/mail.js"; 
import Razorpay from "razorpay";
import crypto from "crypto";
// import { generatePDFBuffer } from "../../services/pdf.service.js";
import dotenv from "dotenv";
import DonationReg from "../../model/donor_reg/donor_reg.js";
import { generatePDFBuffer } from "../../services/pdf.service.js";
import { NGO_80G } from "../../config/ngo.config.js";
import { numberToWords } from "../../utils/numberToWords.js";
import Counter from "../../model/Counter/counter.js";
import { uploadToCloudinary } from "../../utils/uploader.js";


dotenv.config();

// Initialize Razorpay with fallback keys
let razorpay = null;
const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_XaFBcDCs2pZQoe';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '3hv6ZUhPh9gIPTA4uX6jEDM8';

if (keyId && keySecret) {
    razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
    console.log(' Razorpay initialized with keys');
} else {
    console.log(' Razorpay keys missing');
}

export const registerDonor = async (req, res) => {
  try {
    // 1. req.body se saare zaroori fields nikaalein (Destructuring)
    const { 
      fullName, 
      organisationName, 
      contactNumber, 
      address, 
      email, 
      panNumber, 
      gstNumber, 
      donationAmount, 
      fundraisingId,
      isPhoneVerified: rawPhoneVerified,
      isEmailVerified: rawEmailVerified
    } = req.body;

    // 2. userId ko req.user se nikaalein (Middleware se aata hai)
    const userId = req.user?._id || null;

    const safeFundId = fundraisingId && fundraisingId !== "" ? fundraisingId : null;

    const isPhoneVerified = String(rawPhoneVerified).toLowerCase() === "true";
    const isEmailVerified = String(rawEmailVerified).toLowerCase() === "true";

    console.log("📝 FINAL FLAGS =>", { isPhoneVerified, isEmailVerified, userId });

    // 3. Donation Registration record create karein
    const donorEntry = await DonationReg.create({
      userId: userId,
      name: fullName,
      organisationName: organisationName,
      contactNumber: contactNumber,
      address: address,
      email: email,
      panNumber: panNumber,
      gstNumber: gstNumber,
      isPhoneVerified: Boolean(isPhoneVerified),
      isEmailVerified: Boolean(isEmailVerified),
      status: "pending",
      donationAmount: donationAmount,
      fundraisingId: safeFundId,
      uploadPaymentProof: req.file ? req.file.path : "",
    });

    // 4. User Profile update karein (Agar user logged in hai)
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $set: { 
          panNumber: panNumber, // User model mein PAN update
          address: address,     // User model mein Address update
          contactNumber: contactNumber // User model mein Phone update
        }
      });
      console.log("✅ User profile updated with PAN, Address and Phone");
    }

    return res.json({
      success: true,
      data: donorEntry,
    });

  } catch (error) {
    console.error("❌ Register Donor Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createDonationOrder = async (req, res) => {
  try {
    console.log(" Incoming Donation Body:", req.body);

    const {
      amount,
      modeofDonation,
      donorName,
      donorEmail,
      donorPhone,
      panNumber,
      address,
      fundraisingId,
      fromRegistration
    } = req.body;

    const userId = req.user?._id || null;

    if (!razorpay) return res.status(500).json({ message: "Payment gateway missing" });
    if (!amount || !modeofDonation) return res.status(400).json({ message: "Amount & payment mode required" });
    if (amount < 1) return res.status(400).json({ message: "Amount must be ≥ 1" });

    // ================================
    // ✅ ONLY ONLINE PAYMENT ALLOWED
    // ================================
    const allowedModes = ["upi", "card", "netbanking"];
    if (!allowedModes.includes(modeofDonation)) {
      return res.status(400).json({
        message: "Only online payments are allowed"
      });
    }

    // =================================================
    // 🔥 SAFE RECEIPT NUMBER USING COUNTER (NO DUPLICATE)
    // =================================================
    const counter = await Counter.findOneAndUpdate(
      { name: "donationReceipt" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const customReceiptId = `pay_orbosis${String(counter.seq).padStart(6, "0")}`;
    // =================================================

    // ONLINE DONATION (RAZORPAY)
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: customReceiptId,
      notes: { fromRegistration, userId, modeofDonation, donorName, donorEmail, fundraisingId },
    };

    const order = await razorpay.orders.create(options);

    const newDonation = await Donation.create({
      userId,
      amount,
      modeofDonation,
      razorpayOrderId: order.id,
      paymentStatus: "pending",
      donorName,
      donorEmail,
      donorPhone,
      panNumber,
      address,
      fundraisingId,
      receiptNo: customReceiptId,
      is80GEligible: true   // 👈 online payment = always eligible
    });

    console.log(`🚀 Order Created: ${customReceiptId}`);

    return res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      receipt: customReceiptId,
      details: { amount, donorName, donorEmail, fundraisingId },
    });

  } catch (err) {
    console.error(" Error in donation:", err);
    return res.status(500).json({ error: err.message });
  }
};



export const verifyDonationPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const secret = process.env.RAZORPAY_KEY_SECRET || '3hv6ZUhPh9gIPTA4uX6jEDM8';

        // 1. Signature Verification
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(sign.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // 2. Donation Record dhundo
        const donation = await Donation.findOne({ razorpayOrderId: razorpay_order_id });
        if (!donation) {
            return res.status(404).json({ message: "Donation record not found" });
        }

        // 3. User (Donor) ki registration details fetch karo PAN ke liye
        const donorReg = await User.findById(donation.userId);

        // 4. PAN Number decide karo (Pehle check karo agar payment form se aaya hai, warna DB se)
        const finalPan = req.body.panNumber || donation.panNumber || (donorReg ? donorReg.panNumber : "N/A");

        // 5. Update Donation Status in DB
        donation.razorpayPaymentId = razorpay_payment_id;
        donation.razorpaySignature = razorpay_signature;
        donation.paymentStatus = "completed";
        donation.panNumber = finalPan;

        // 6. PDF Receipt Generation aur Email Logic
        try {

const receiptData = {
  // NGO DETAILS
  ngoName: NGO_80G.name,
  ngoAddress: NGO_80G.address,
  ngoPan: NGO_80G.pan,
  section80GNumber: NGO_80G.registration80G,
  validity: NGO_80G.validity,

  // DONOR DETAILS
  donorName: donation.donorName,
  donorEmail: donation.donorEmail,
  donorPan: finalPan,

  // DONATION DETAILS
  amount: donation.amount,
  amountInWords: numberToWords(donation.amount),
  modeOfPayment: donation.modeofDonation,
  transactionId: razorpay_payment_id,
  receiptNo: donation.receiptNo,
  date: new Date().toLocaleDateString("en-IN"),

  // DECLARATION
  declaration:
    "This donation is eligible for deduction under Section 80G of the Income Tax Act, 1961.",

  signature: NGO_80G.signatureImage
};


            // Buffer generate karo
            const pdfBuffer = await generatePDFBuffer(receiptData, "donation");

            // Local folder mein save karo
            const fileName = `receipt-${donation._id}.pdf`;
            const directoryPath = path.join(process.cwd(), "uploads", "receipts");

            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }

            const filePath = path.join(directoryPath, fileName);
            fs.writeFileSync(filePath, pdfBuffer);

            // DB mein URL update karo
            donation.receiptUrl = `/uploads/receipts/${fileName}`;
            await donation.save(); // Sab save kar diya

            console.log("✅ Receipt Saved and DB Updated:", donation.receiptUrl);

            // Email bhej do
            // await sendReceiptEmail({
            //     email: donation.donorEmail,
            //     name: donation.donorName,
            //     amount: donation.amount,
            //     pdfBuffer: pdfBuffer,
            //     transactionId: razorpay_payment_id
            // });

        } catch (pdfErr) {
            console.error("❌ PDF/Email Automation Error:", pdfErr.message);
            // Agar PDF fail ho jaye tab bhi donation status save hona chahiye
            await donation.save();
        }

        // 7. Success Response
        res.json({ 
            success: true, 
            message: "Payment verified and receipt processed",
            donation 
        });

    } catch (error) {
        console.error("Verification Route Error:", error);
        res.status(500).json({ error: error.message });
    }
};
// Get user donations with total amount
export const getUserDonations = async (req, res) => {
  try {
    const userId = req.user._id; 
    
    // Yahan Donation collection se data uthega
    const donations = await Donation.find({ 
      userId: userId,
      paymentStatus: "completed" 
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      donations: donations // Frontend is key ko map karega
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get real-time donor statistics
export const getDonorStats = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const donations = await Donation.find({ userId, paymentStatus: 'completed' });
        const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
        const donationsCount = donations.length;
        
        // Calculate impact metrics
        const impactScore = Math.min(100, Math.floor(totalDonated / 1000) + donationsCount * 5);
        const beneficiariesHelped = Math.floor(totalDonated / 500) + donationsCount * 2;
        
        const stats = {
            totalDonated,
            donationsCount,
            impactScore,
            beneficiariesHelped,
            lastUpdated: new Date()
        };
        
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get recent donations for real-time updates
export const getRecentDonations = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const recentDonations = await Donation.find({ userId })
            .select('amount paymentStatus modeofDonation createdAt')
            .sort({ createdAt: -1 })
            .limit(5);
            
        const formattedDonations = recentDonations.map(donation => ({
            id: donation._id,
            amount: donation.amount,
            date: donation.createdAt,
            cause: donation.modeofDonation === 'upi' ? 'Education' : 'Healthcare',
            status: donation.paymentStatus
        }));
        
        res.json({ success: true, donations: formattedDonations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Emit real-time updates when donation status changes
export const emitDonorUpdate = (io, userId, updateType, data) => {
    io.to(`donor-${userId}`).emit('donor-update', {
        type: updateType,
        data,
        timestamp: new Date()
    });
};
// ===============================
// ADMIN : GET ALL DONATIONS
// ===============================
export const getAllDonationsForAdmin = async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate({
        path: "userId",
        select: "fullName email",
        options: { strictPopulate: false }
      })
      // .populate("fundraisingId", "title")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: donations
    });
  } catch (error) {
    console.error("ADMIN DONATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
/* ================= UPDATE SIGNUP USER PROFILE ================= */
export const updateDonorProfile = async (req, res) => {
  try {
    const { panNumber, gstNumber, address, contactNumber, organisationName } = req.body;
    const userId = req.user._id;

    console.log("🛠️ Signup User Update Start for ID:", userId);

    const updateData = {};
    if (panNumber) updateData.panNumber = panNumber;
    if (gstNumber) updateData.gstNumber = gstNumber;
    if (address) updateData.address = address;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (organisationName) updateData.organisationName = organisationName;

    // 1. Pehle MAIN USER (Auth) collection update karein (Ye signup data update karega)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.log("❌ User not found in Auth collection");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Phir DonationReg update karein (Agar user ne kabhi registration form bhara ho toh)
    await DonationReg.findOneAndUpdate(
      { userId: userId },
      { $set: updateData },
      { new: true }
    );

    console.log("✅ User Collection and DonationReg Synced Successfully");

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      data: updatedUser 
    });
  } catch (err) {
    console.error("❌ Update Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};