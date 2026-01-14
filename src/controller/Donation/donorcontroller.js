import DonationReg from "../../model/donor_reg/donor_reg.js";
import Donation from "../../model/Donation/donation.js";
import User from "../../model/Auth/auth.js";
import bcrypt from "bcrypt";
import { sendDonorWelcomeEmail } from "../../utils/mail.js";
const generateDonorPassword = (name, mobile) => {
  if (!name || !mobile) return null;

  // first 3 letters of name
  const cleanName = name.replace(/\s+/g, "");
  const namePart = cleanName.substring(0, 3).toLowerCase();

  // last 4 digits of mobile
  const mobileStr = mobile.toString();
  if (mobileStr.length < 4) return null;

  const last4 = mobileStr.slice(-4);

  return `${namePart}@${last4}`;
};



/* ================= REGISTER DONOR ================= */
export const registerDonor = async (req, res) => {
  try {
    const safeFundId =
      req.body.fundraisingId && req.body.fundraisingId !== ""
        ? req.body.fundraisingId
        : null;
       console.log("REQ BODY ===>", req.body);

    const donorEntry = await DonationReg.create({
      userId: req.user?._id || null,
      name: req.body.fullName,
      organisationName: req.body.organisationName,
      contactNumber: req.body.contactNumber,
      address: req.body.address,
      email: req.body.email,
      panNumber: req.body.panNumber,
      gstNumber: req.body.gstNumber,
        isPhoneVerified: req.body.isPhoneVerified === 'true' || req.body.isPhoneVerified === true || false,
    isEmailVerified: req.body.isEmailVerified === 'true' || req.body.isEmailVerified === true || false,
       status: "pending",
      donationAmount: req.body.donationAmount,
      fundraisingId: safeFundId,
      uploadPaymentProof: req.file ? req.file.path : "",
    });

    // UPDATE FUNDRAISING AMOUNT
    if (safeFundId) {
      const Fund = await import("../../model/fundraising/fundraising.js").then(
        (m) => m.default
      );

      const fundItem = await Fund.findById(safeFundId);
      if (fundItem) {
        fundItem.payment =
          Number(fundItem.payment || 0) +
          Number(req.body.donationAmount || 0);
        await fundItem.save();
      }
    }

    return res.json({
      success: true,
      message: "Donor registered successfully",
      data: donorEntry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to register donor",
      error: error.message,
    });
  }
};

/* ================= DONOR PROFILE ================= */
export const getDonorProfile = async (req, res) => {
  try {
    const profile = await DonationReg.findOne({
      userId: req.user._id,
    });

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch donor profile",
    });
  }
};

/* ================= DONATION HISTORY ================= */
export const getDonorHistory = async (req, res) => {
  try {
    // Fetch from the main Donation collection for the logged-in user
    const donations = await Donation.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      donations: donations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch donation history.",
      error: error.message,
    });
  }
};

/* ================= DONOR DASHBOARD ================= */
export const getDonorDashboard = async (req, res) => {
  try {
    const totalAmount = await Donation.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return res.json({
      success: true,
      totalDonation: totalAmount[0]?.total || 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};
 export const getPendingDonors = async (req, res) => {
  try {
    const donors = await DonationReg.find({ status: "pending" })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: donors,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// export const approveDonor = async (req, res) => {
//   try {
//     const donor = await DonationReg.findById(req.params.id);
//     if (!donor) {
//       return res.status(404).json({ message: "Donor not found" });
//     }

//     if (donor.status !== "pending") {
//       return res.status(400).json({ message: "Already processed" });
//     }

//     // 🔐 ADMIN GENERATED PASSWORD
//     const plainPassword = Math.random().toString(36).slice(-8);
//     const hashedPassword = await bcrypt.hash(plainPassword, 10);

//     // 👤 CREATE USER
//     const user = await User.create({
//       fullName: donor.name,
//       email: donor.email,
//       contactNumber: donor.contactNumber,
//       role: "donor",
//       password: hashedPassword,
//       isEmailVerified: donor.isEmailVerified,
//       isPhoneVerified: donor.isPhoneVerified,
//     });

//     // 💰 CREATE DONATION RECORD
//     const donation = await Donation.create({
//       userId: user._id,
//       amount: donor.donationAmount,
//       paymentMethod: donor.modeofDonation,
//       status: "success",
//       fundraisingId: donor.fundraisingId,
//     });

//     // 🔁 UPDATE DONOR
//     donor.userId = user._id;
//     donor.status = "approved";
//     donor.approvedAt = new Date();
//     donor.approvedBy = req.user._id;

//     await donor.save();

//     // 📧 (optional) send email with password

//     res.json({
//       success: true,
//       message: "Donor approved, user & donation created",
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
// export const approveDonor = async (req, res) => {
//   try {
//     const donor = await DonationReg.findById(req.params.id);
//     if (!donor) {
//       return res.status(404).json({ message: "Donor not found" });
//     }

//     if (donor.status === "approved") {
//       return res.status(400).json({ message: "Already approved" });
//     }

//     // 🔍 USER DUPLICATE CHECK (🔥 FIX)
//     const existingUser = await User.findOne({ email: donor.email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "User already exists with this email",
//       });
//     }

//     // 🔐 generate password
//     const plainPassword = Math.random().toString(36).slice(-8);
//     const hashedPassword = await bcrypt.hash(plainPassword, 10);

//     // 👤 create donor user (AUTH USER)
//     const user = await User.create({
//       fullName: donor.name,
//       email: donor.email,
//       contactNumber: donor.contactNumber,
//       role: "donor",
//       password: hashedPassword,
//       isEmailVerified: donor.isEmailVerified,
//       isPhoneVerified: donor.isPhoneVerified,
//     });

//     // ✅ update donor profile
//     donor.userId = user._id;
//     donor.status = "approved";
//     donor.profileStatus = "approved";
//     donor.approvedAt = new Date();
//     donor.approvedBy = req.user._id;

//     await donor.save();

//     // 📧 (OPTIONAL but recommended)
//     // send email: email + password

//     return res.json({
//       success: true,
//       message: "Donor approved & login account created",
//       credentials: {
//         email: donor.email,
//         password: plainPassword, // sirf email me bhejna
//       },
//     });

//   } catch (err) {
//     console.error("❌ approveDonor error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };


// export const rejectDonor = async (req, res) => {
//   try {
//     const donor = await DonationReg.findById(req.params.id);

//     if (!donor) {
//       return res.status(404).json({ message: "Donor not found" });
//     }

//     donor.status = "rejected";
//     await donor.save();

//     res.json({
//       success: true,
//       message: "Donor request rejected",
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
// import DonationReg from "../../model/donor_reg/donor_reg.js";
// import Donation from "../../model/Donation/donation.js";
// import User from "../../model/Auth/auth.js";
// import bcrypt from "bcrypt";
// import { sendDonorWelcomeEmail, sendDonorRejectionEmail } from "../../utils/mail.js";

// import Donation from "../../model/Donation/donation.js"; // 🔥 ADD THIS

export const updateDonorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, password } = req.body;
    let finalPassword = password; // Declare password variable here
console.log(password);    
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const donor = await DonationReg.findById(id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });

    // Check if already processed
    if (donor.status === status) {
      return res.status(400).json({ message: `Donor already ${status}` });
    }

    if (status === "rejected") {
      donor.status = "rejected";
      await donor.save();
      return res.json({ success: true, message: "Donor request rejected" });
    }

    if (status === "approved") {
      let user = await User.findOne({ email: donor.email });

      // 1. Generate Password if not provided by admin
      if (!finalPassword) {
  finalPassword = generateDonorPassword(
    donor.name,
    donor.contactNumber
  );

  if (!finalPassword) {
    return res.status(400).json({
      message: "Donor name or mobile number missing for password generation"
    });
  }
}


      console.log("🔐 DONOR LOGIN PASSWORD (PLAIN):", finalPassword);
      const hashedPassword = await bcrypt.hash(finalPassword, 10);

      if (!user) {
        const memberId = "donor" + Date.now();
        user = await User.create({
          fullName: donor.name,
          email: donor.email,
          contactNumber: donor.contactNumber,
          role: "donor",
          password: hashedPassword,
          memberId: memberId,
          isEmailVerified: donor.isEmailVerified,
          isPhoneVerified: donor.isPhoneVerified,
          tempPassword: true,
          organisationName: donor.organisationName,
          address: donor.address,
          panNumber: donor.panNumber,
          gstNumber: donor.gstNumber
        });
      } else {
        // ⚠️ Security: Admin account ko overwrite mat karo
        if (user.role === 'admin') {
            return res.status(400).json({ message: "Cannot approve donor request linked to an Admin email." });
        }
        
        // ✅ Existing user ka password update karo taaki email wala password kaam kare
        user.password = hashedPassword;
        user.tempPassword = true;
        await user.save();
      }

      // 2. Create Donation Record (Important)
      await Donation.create({
        userId: user._id,
        amount: donor.donationAmount,
        modeofDonation: donor.modeofDonation || "bankTransfer",
        paymentStatus: "completed",
        donorName: donor.name,
        donorEmail: donor.email,
        donorPhone: donor.contactNumber,
        fundraisingId: donor.fundraisingId,
      });

      // 3. Update Donor Request (SAVE LAST to prevent partial updates)
      donor.userId = user._id;
      donor.status = "approved";
      donor.approvedAt = new Date();
      donor.approvedBy = req.user._id;
      
      await donor.save();

      // 4. Send Email
      try {
        await sendDonorWelcomeEmail({
          toEmail: user.email,
          fullName: user.fullName,
          email: user.email,
          password: finalPassword
          });
      } catch (mailError) {
        console.error("Mail sending failed:", mailError);
      }
    }

    return res.json({
      success: true,
      message: `Donor ${status} successfully`,
      // Conditionally add the generated password to the response for the admin
      ...(status === "approved" && { generatedPassword: finalPassword }),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const getAllDonors = async (req, res) => {
  const donors = await DonationReg.find().sort({ createdAt: -1 });
  res.json({ success: true, data: donors });
};
// donorcontroller.js ke top par check karein
// import Donor from "../../model/Donation/donor.js"; // Aapka donor model ka sahi path

export const getSingleDonor = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Yahan DonationReg use kar kyunki tune upar wahi import kiya hai
        const donor = await DonationReg.findById(id); 
        
        if (!donor) {
            return res.status(404).json({ 
                success: false, 
                message: "Donor details not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            data: donor 
        });
    } catch (err) {
        console.error("❌ Error:", err.message);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error: " + err.message 
        });
    }
};