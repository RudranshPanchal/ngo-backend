import Donation from "../../model/Donation/donation.js";
import User from "../../model/Auth/auth.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import DonationReg from "../../model/donor_reg/donor_reg.js";
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
    console.log('✅ Razorpay initialized with keys');
} else {
    console.log('❌ Razorpay keys missing');
}


// export const registerDonor= async (req,res)=>{
//     const {fullname,Contact}=req.body;
//     const data = await DonationReg.create({
//         name : fullname,
//         Contact:Contact,

//     })
//       return res.json({
//                 success: true,
//                 message: ` donation recorded successfully`,    
//             });
// }
// export const registerDonor = async (req, res) => {
//   try {
//     const { fullName, donationAmount, fundraisingId } = req.body;

//     // 🔥 USER ID FROM TOKEN
//      const userId = req.user?._id || null; 

//     // if (!userId) {
//     //   return res.status(401).json({
//     //     success: false,
//     //     message: "Unauthorized: user not logged in"
//     //   });
//     // }

//     const donor = await DonationReg.create({
//       userId, 
//       name: fullName,
//       organisationName: req.body.organisationName,
//       contactNumber: req.body.contactNumber,
//       email: req.body.email,
//       address: req.body.address,
//       panNumber: req.body.panNumber,
//       gstNumber: req.body.gstNumber,
//       donationAmount,
//       fundraisingId: fundraisingId || null,
//       uploadPaymentProof: req.file ? req.file.path : ""
//     });

//     return res.json({
//       success: true,
//       message: "Donation recorded successfully",
//       data: donor
//     });

//   } catch (error) {
//     console.error("registerDonor error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
export const registerDonor = async (req, res) => {
  try {
    const safeFundId =
      req.body.fundraisingId && req.body.fundraisingId !== ""
        ? req.body.fundraisingId
        : null;

    const isPhoneVerified =
      String(req.body.isPhoneVerified).toLowerCase() === "true";

    const isEmailVerified =
      String(req.body.isEmailVerified).toLowerCase() === "true";

    console.log("📝 FINAL FLAGS =>", {
      isPhoneVerified,
      isEmailVerified,
      body: req.body,
    });

    const donorEntry = await DonationReg.create({
      userId: req.user?._id || null,
      name: req.body.fullName,
      organisationName: req.body.organisationName,
      contactNumber: req.body.contactNumber,
      address: req.body.address,
      email: req.body.email,
      panNumber: req.body.panNumber,
      gstNumber: req.body.gstNumber,
      isPhoneVerified: Boolean(isPhoneVerified),
      isEmailVerified: Boolean(isEmailVerified),
      status: "pending",
      donationAmount: req.body.donationAmount,
      fundraisingId: safeFundId,
      uploadPaymentProof: req.file ? req.file.path : "",
    });

    return res.json({
      success: true,
      data: donorEntry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const createDonationOrder = async (req, res) => {
  try {
    console.log("🔥 Incoming Donation Body:", req.body);
    console.log("🔥 Received fundraisingId:", req.body.fundraisingId);

    const {
  amount,
  modeofDonation,
  donorName,
  donorEmail,
  donorPhone,
  fundraisingId,
  fromRegistration // 👈 NEW FLAG
} = req.body;

const userId = req.user?._id || null;


    console.log("🔍 Extracted:", { amount, modeofDonation, donorName, donorEmail, donorPhone, fundraisingId });

    if (!razorpay) return res.status(500).json({ message: "Payment gateway missing" });

    if (!amount || !modeofDonation)
      return res.status(400).json({ message: "Amount & payment mode required" });

    if (amount < 1) return res.status(400).json({ message: "Amount must be ≥ 1" });

    if (!["bankTransfer", "upi", "cash", "cheque"].includes(modeofDonation))
      return res.status(400).json({ message: "Invalid mode" });

    // CASH / CHEQUE DONATION
    if (["cash", "cheque"].includes(modeofDonation)) {
      console.log("⚡ CASH / CHEQUE donation triggered");
      console.log("⚡ fundraisingId inside block:", fundraisingId);

      const donation = await Donation.create({
        userId,
        amount,
        modeofDonation,
        paymentStatus: "pending",
        donorName: donorName || "Anonymous",
        donorEmail: donorEmail || "noemail@example.com",
        donorPhone: donorPhone || "0000000000",
        fundraisingId,
      });

      // UPDATE FUND
      if (fundraisingId) {
        const Fund = await import("../../model/fundraising/fundraising.js").then(m => m.default);
        const fundItem = await Fund.findById(fundraisingId);

        console.log("📌 Before update:", fundItem?.payment);

        if (fundItem) {
          fundItem.payment = Number(fundItem.payment) + Number(amount);
          await fundItem.save();
          console.log("⭐ After update:", fundItem.payment);
        } else {
          console.log("❌ Fundraising not found:", fundraisingId);
        }
      } else {
        console.log("❌ NO fundraisingId received");
      }

      return res.json({
        success: true,
        message: `${modeofDonation} donation recorded`,
        donation,
      });
    }

    // ONLINE DONATION (RAZORPAY)
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: "donation_" + Date.now(),
      notes: { fromRegistration, userId, modeofDonation, donorName, donorEmail, fundraisingId },
    };

    const order = await razorpay.orders.create(options);

    await Donation.create({
      userId,
      amount,
      modeofDonation,
      razorpayOrderId: order.id,
      paymentStatus: "pending",
      donorName,
      donorEmail,
      donorPhone,
      fundraisingId,
    });

    console.log("⚡ Razorpay order created. fundraisingId:", fundraisingId);

    return res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      details: { amount, donorName, donorEmail, fundraisingId },
    });

  } catch (err) {
    console.error("❌ Error in donation:", err);
    return res.status(500).json({ error: err.message });
  }
};



// Verify Razorpay payment
export const verifyDonationPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fromRegistration } = req.body;

        // FIX: Wahi secret use karein jo initialize karte waqt define kiya tha
        const secret = process.env.RAZORPAY_KEY_SECRET || '3hv6ZUhPh9gIPTA4uX6jEDM8';

        // Verify the payment signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret) // Yahan 'secret' variable use karein
            .update(sign.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.log("❌ Signature Mismatch!");
            console.log("Expected:", expectedSignature);
            console.log("Received:", razorpay_signature);
            return res.status(400).json({ message: "Payment verification failed" });
        }
        
        // ... baki ka code same rahega
        // Find the donation record by order ID
        const donation = await Donation.findOne({ razorpayOrderId: razorpay_order_id });
        if (!donation) {
            return res.status(404).json({ message: "Donation record not found" });
        }

        // Update donation with payment details
        donation.razorpayPaymentId = razorpay_payment_id;
        donation.razorpaySignature = razorpay_signature;
        donation.paymentStatus = "completed";
        await donation.save();

        // 🔥 IF PAYMENT CAME FROM REGISTRATION PAGE
if (fromRegistration === true) {
  const existing = await DonationReg.findOne({
    email: donation.donorEmail,
    status: "pending"
  });

  if (!existing) {
    await DonationReg.create({
      name: donation.donorName,
      email: donation.donorEmail,
      contactNumber: donation.donorPhone,
      donationAmount: donation.amount,
      fundraisingId: donation.fundraisingId || null,
      status: "pending"
    });
  }
}

 // ⭐ STEP-3: UPDATE FUNDRAISING PROGRESS
        if (donation.fundraisingId) {
            const Fund = await import('../../model/fundraising/fundraising.js').then(m => m.default);
            const fundItem = await Fund.findById(donation.fundraisingId);

            if (fundItem) {
                fundItem.payment = Number(fundItem.payment) + Number(donation.amount);
                await fundItem.save();
                console.log("Fundraising Updated After Razorpay Payment");
            }
        }


        // Emit real-time update to donor
        const io = req.app?.get('io');
        if (io) {
            emitDonorUpdate(io, donation.userId, 'donation-completed', {
                donationId: donation._id,
                amount: donation.amount,
                status: 'completed'
            });
        }

        res.json({ 
            success: true, 
            message: "Payment verified and donation completed",
            donation: {
                _id: donation._id,
                amount: donation.amount,
                paymentStatus: donation.paymentStatus,
                razorpayPaymentId: donation.razorpayPaymentId
            }
        });

    } catch (error) {
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
