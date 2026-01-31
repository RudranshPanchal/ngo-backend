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
import Notification from "../../model/Notification/notification.js";
import Fundraiser from "../../model/Fundraiser/fundraiser.js";


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

    const userId = req.user?._id || null;

    const safeFundId = fundraisingId && fundraisingId !== "" ? fundraisingId : null;

    const isPhoneVerified = String(rawPhoneVerified).toLowerCase() === "true";
    const isEmailVerified = String(rawEmailVerified).toLowerCase() === "true";

    console.log("FINAL FLAGS =>", { isPhoneVerified, isEmailVerified, userId });

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

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $set: { 
          panNumber: panNumber, 
          address: address,     
          contactNumber: contactNumber 
        }
      });
      console.log(" User profile updated with PAN, Address and Phone");
    }

    const newNotification = await Notification.create({
        userType: "admin",
        message: `New donor registration from ${fullName} for ₹${donationAmount}.`,
        type: "donor-registration",
        role: "donor",
        read: false
    });

    const io = req.app.get("io");
    if (io) {
        io.to("admins").emit("admin-notification", newNotification);
        console.log(' Admin notification sent for new donor registration.');
    }

    return res.json({
      success: true,
      data: donorEntry,
    });

  } catch (error) {
    console.error("Register Donor Error:", error.message);
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
      fromRegistration,
      purposeOfDonation

    } = req.body;
console.log("Saving Address:", address || "N/A");
console.log("Saving Purpose:", purposeOfDonation || "General Donation");
    const userId = req.user?._id || null;

    if (!razorpay) return res.status(500).json({ message: "Payment gateway missing" });
    if (!amount || !modeofDonation) return res.status(400).json({ message: "Amount & payment mode required" });
    if (amount < 1) return res.status(400).json({ message: "Amount must be ≥ 1" });

    //  ONLY ONLINE PAYMENT ALLOWED
    const allowedModes = ["upi", "card", "netbanking"];
    if (!allowedModes.includes(modeofDonation)) {
      return res.status(400).json({
        message: "Only online payments are allowed"
      });
    }

    // Temporary receipt reference for Razorpay order (actual receipt generated after payment)
    const tempReceiptRef = `ord_ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // ONLINE DONATION (RAZORPAY)
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: tempReceiptRef,
      notes: { fromRegistration, userId, modeofDonation, donorName, donorEmail, fundraisingId },
    };

    const order = await razorpay.orders.create(options);

    let newDonation;
    try {
      newDonation = await Donation.create({
        userId,
        amount,
        modeofDonation,
        razorpayOrderId: order.id,
        paymentStatus: "pending",
        donorName,
        donorEmail,
        donorPhone,
        panNumber,
        address: address || "N/A",
        fundraisingId,
        purposeOfDonation: purposeOfDonation || "General Donation",
        is80GEligible: true   
      });
    } catch (err) {
      // Fix for "E11000 duplicate key error" on receiptNo: null
      // This happens if the index is not sparse. We drop it so it can be recreated correctly.
      if (err.code === 11000 && err.keyPattern && err.keyPattern.receiptNo) {
        console.log("⚠️ Fixing duplicate index issue on receiptNo...");
        await Donation.collection.dropIndex("receiptNo_1");
        newDonation = await Donation.create({
          userId,
          amount,
          modeofDonation,
          razorpayOrderId: order.id,
          paymentStatus: "pending",
          donorName,
          donorEmail,
          donorPhone,
          panNumber,
          address: address || "N/A",
          fundraisingId,
          purposeOfDonation: purposeOfDonation || "General Donation",
          is80GEligible: true   
        });
      } else {
        throw err;
      }
    }

    console.log(`🚀 Order Created: ${order.id}`);

    return res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
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

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(sign.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const donation = await Donation.findOne({ razorpayOrderId: razorpay_order_id });
    if (!donation) {
      return res.status(404).json({ message: "Donation record not found" });
    }

    // Agar payment pehle se hi verified hai
    if (donation.paymentStatus === "completed") {
      return res.json({
        success: true,
        message: "Payment already verified",
        donation
      });
    }

    const donorReg = await User.findById(donation.userId);
    const finalPan = req.body.panNumber || donation.panNumber || (donorReg ? donorReg.panNumber : "N/A");

    donation.razorpayPaymentId = razorpay_payment_id;
    donation.razorpaySignature = razorpay_signature;
    donation.paymentStatus = "completed";
    donation.panNumber = finalPan;

    //  GENERATE RECEIPT NUMBER AFTER SUCCESSFUL PAYMENT
    if (!donation.receiptNo) {
      const counter = await Counter.findOneAndUpdate(
        { name: "donationReceipt" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      donation.receiptNo = `pay_orbosis${String(counter.seq).padStart(6, "0")}`;
    }

    // --- PDF Generation and Upload Logic ---
    try {
      const receiptData = {
        ngoName: NGO_80G.name,
        ngoAddress: NGO_80G.address,
        ngoPan: NGO_80G.pan,
        ngoLogo: NGO_80G.ngoLogo || NGO_80G.logo,
        registration80G: NGO_80G.registration80G,
        validity: NGO_80G.validity,
        donorName: donation.donorName,
        donorEmail: donation.donorEmail,
        donorPan: finalPan,
        donorAddress: donation.address || "N/A",
        donationPurpose: donation.purposeOfDonation || "N/A",
        amount: donation.amount,
        amountInWords: numberToWords(donation.amount),
        modeOfPayment: donation.modeofDonation,
        transactionId: razorpay_payment_id,
        receiptNo: donation.receiptNo,
        date: new Date().toLocaleDateString("en-IN"),
        declaration: "This donation is eligible for deduction under Section 80G of the Income Tax Act, 1961.",
        signature: NGO_80G.signatureImage
      };

      const pdfBuffer = await generatePDFBuffer(receiptData, "donation");
      const receiptUrl = await uploadToCloudinary(pdfBuffer, "receipts");

      if (receiptUrl) {
        donation.receiptUrl = receiptUrl;
        console.log("✅ Receipt URL generated:", receiptUrl);
      } else {
        console.error("❌ Receipt Upload Failed: No URL returned from Cloudinary");
      }
    } catch (pdfErr) {
      console.error("❌ PDF/Receipt Generation Error:", pdfErr.message);
    }

    await donation.save();
    console.log("✅ Donation Processed & DB Updated. Receipt URL:", donation.receiptUrl || "Not generated");

    //  SAVE & SEND NOTIFICATION (Database + Real-time)
    if (donation.paymentStatus === "completed") {
      const newNotification = await Notification.create({
        userType: "admin",
        message: `New donation of ₹${donation.amount} received from ${donation.donorName}.`,
        type: "donation",
        role: "donor",
        read: false
      });

      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("admin-notification", newNotification);
        console.log('Admin notification sent for new donation.');
      }

      //  UPDATE FUNDRAISER PROGRESS
      if (donation.fundraisingId) {
        try {
          // Try updating new Fundraiser model first
          let fundUpdated = false;
          try {
            const fundraiser = await Fundraiser.findById(donation.fundraisingId);
            if (fundraiser) {
              fundraiser.raisedAmount = (Number(fundraiser.raisedAmount) || 0) + Number(donation.amount);
              await fundraiser.save();
              fundUpdated = true;
              console.log(`✅ Fundraiser (New) updated: ₹${fundraiser.raisedAmount}`);
            }
          } catch (e) {
            // Ignore error if ID format doesn't match or not found
          }

          if (!fundUpdated) {
            // Fallback to legacy Fundraising model
            const FundraisingModel = (await import("../../model/fundraising/fundraising.js")).default;
            const fundItem = await FundraisingModel.findById(donation.fundraisingId);

            if (fundItem) {
              const donationAmount = Number(donation.amount);
              fundItem.raisedAmount = (Number(fundItem.raisedAmount) || 0) + donationAmount;
              // Update legacy 'payment' field if it exists
              if (fundItem.payment !== undefined) {
                fundItem.payment = (Number(fundItem.payment) || 0) + donationAmount;
              }
              await fundItem.save();
              console.log(`✅ Fundraiser (Legacy) updated: ₹${fundItem.raisedAmount}`);
            }
          }
        } catch (fundErr) {
          console.error("Progress Update Failed:", fundErr.message);
        }
      }

      // Update Member Stats
      if (donation.userId) {
        try {
          const user = await User.findById(donation.userId);
          if (user && user.role === 'member' && user.memberId) {
            const Member = (await import("../../model/Member/member.js")).default;
            await Member.findOneAndUpdate(
              { memberId: user.memberId },
              { $inc: { totalDonations: donation.amount } }
            );
            console.log(`Member ${user.memberId} totalDonations updated by ₹${donation.amount}`);
          }
        } catch (memberErr) {
          console.error(" Failed to update member stats:", memberErr.message);
        }
      }
    }

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
export const getUserDonations = async (req, res) => {
  try {
    const userId = req.user._id; 
    const userEmail = req.user.email;
    
    const donations = await Donation.find({ 
      $or: [
        { userId: userId },
        { donorEmail: userEmail }
      ],
      paymentStatus: "completed" 
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      donations: donations 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDonorStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user.email;
        
        const donations = await Donation.find({ 
            $or: [{ userId: userId }, { donorEmail: userEmail }],
            paymentStatus: 'completed' 
        });

        const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
        const donationsCount = donations.length;
        
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

export const emitDonorUpdate = (io, userId, updateType, data) => {
    io.to(`donor-${userId}`).emit('donor-update', {
        type: updateType,
        data,
        timestamp: new Date()
    });
};
// ADMIN : GET ALL DONATIONS
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

// ADMIN : GET ACTIVE DONORS (FROM USER COLLECTION)
export const getActiveDonorsFromUserCollection = async (req, res) => {
  try {
    const donors = await User.find({ role: "donor" }).sort({ createdAt: -1 });

    const formattedDonors = donors.map(user => ({
      _id: user._id,
      donorName: user.fullName,
      donorEmail: user.email,
      amount: 0, 
      modeofDonation: "Registered",
      paymentStatus: "Active",
      receiptUrl: null,
      createdAt: user.createdAt
    }));

    res.json({ success: true, data: formattedDonors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADMIN : GET SINGLE DONOR DETAILS (BY USER ID OR DONATION ID)
export const getDonorById = async (req, res) => {
  try {
    const { id } = req.params;
    

    let donor = await User.findById(id).lean();
    let totalDonationAmount = 0;

    if (donor) {
      const donations = await Donation.find({ userId: donor._id, paymentStatus: 'completed' });
      totalDonationAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    } else {
      const donation = await Donation.findById(id);
      if (donation) {
        if (donation.userId) {
          donor = await User.findById(donation.userId).lean();
          if (donor) {
            const donations = await Donation.find({ userId: donor._id, paymentStatus: 'completed' });
            totalDonationAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
          }
        } 
        
        if (!donor) {
          const donations = await Donation.find({ donorEmail: donation.donorEmail, paymentStatus: 'completed' });
          totalDonationAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

          donor = {
            _id: null,
            fullName: donation.donorName,
            email: donation.donorEmail,
            contactNumber: donation.donorPhone,
            address: donation.address,
            panNumber: donation.panNumber,
            role: "Guest Donor"
          };
        }
      }
    }

    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor details not found" });
    }

    donor.totalDonationAmount = totalDonationAmount;

    res.json({ success: true, data: donor });
  } catch (error) {
    console.error("Get Donor Error:", error);
    res.status(500).json({ success: false, message: error.message });
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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.log(" User not found in Auth collection");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await DonationReg.findOneAndUpdate(
      { userId: userId },
      { $set: updateData },
      { new: true }
    );

    console.log(" User Collection and DonationReg Synced Successfully");

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      data: updatedUser 
    });
  } catch (err) {
    console.error("Update Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};