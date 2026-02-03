// import Fundraiser from "../../model/Fundraiser/fundraiser.js";
// import bcrypt from "bcryptjs";

// export const applyForFundraiser = async (req, res) => {
//   try {
//     const {
//       fullName,
//       email,
//       mobile,
//       password,
//       campaignTitle,
//       campaignType,
//       shortDescription,
//       detailedStory,
//       beneficiaryName,
//       beneficiaryGender,
//       city,
//       state,
//       targetAmount,
//       minDonation,
//       startDate,
//       endDate,
//     } = req.body;

//     // Check duplicate email
//     const exists = await Fundraiser.findOne({ email });
//     if (exists) {
//       return res.status(400).json({ message: "Email already used" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const fundraiser = await Fundraiser.create({
//       fullName,
//       email,
//       mobile,
//       password: hashedPassword,
//       campaignTitle,
//       campaignType,
//       shortDescription,
//       detailedStory,
//       beneficiaryName,
//       beneficiaryGender,
//       city,
//       state,
//       targetAmount,
//       minDonation,
//       startDate,
//       endDate,
//       status: "PENDING", // Default status
//       beneficiaryPhoto: req.files?.beneficiaryPhoto?.[0]?.path,
//       documents: req.files?.documents?.[0]?.path,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Fundraiser request submitted for admin approval",
//       data: fundraiser,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const getAdminFundraisers = async (req, res) => {
//   try {
//     const { status } = req.query;
//     let query = {};
    
//     // Filter by status if provided and not 'ALL'
//     if (status && status !== 'ALL') {
//       query.status = status;
//     }

//     const fundraisers = await Fundraiser.find(query).sort({ createdAt: -1 });
//     res.status(200).json(fundraisers);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const updateFundraiserStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, adminRemark } = req.body;

//     const fundraiser = await Fundraiser.findByIdAndUpdate(
//       id,
//       { status, adminRemark },
//       { new: true }
//     );

//     if (!fundraiser) return res.status(404).json({ message: "Fundraiser not found" });

//     res.status(200).json({ success: true, message: "Status updated", data: fundraiser });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
import Fundraiser from "../../model/Fundraiser/fundraiser.js";
// import SignupOtp from "../../model/SignupOtp/SignupOtp.js";
import User from "../../model/Auth/auth.js";
import bcrypt from "bcrypt";
import { uploadToCloudinary } from "../../utils/uploader.js";
import Notification from "../../model/Notification/notification.js";
import { sendFundraiserWelcomeEmail } from "../../utils/mail.js";

const generateFundraiserPassword = (name, mobile) => {
  if (!name || !mobile) return null;

  const cleanName = name.replace(/\s+/g, "");
  const namePart = cleanName.substring(0, 3).toLowerCase();
  const mobileStr = mobile.toString();
  if (mobileStr.length < 4) return null;

  const last4 = mobileStr.slice(-4);

  return `${namePart}@${last4}`;
};

// ================= REGISTER FUNDRAISER (PENDING) =================
export const registerFundraiser = async (req, res) => {
  try {
    console.log("📥 Register Fundraiser Files:", req.files);
    console.log("📥 Register Fundraiser Request Body:", req.body);

    const {
      fullName,
      email,
      mobile,
      fundraiserType,
      reason,
      isPhoneVerified,
      isEmailVerified
    } = req.body;

    if (!fullName || !email || !mobile || !fundraiserType || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    
    // Admin will verify details manually before approval.
    // const otpRecord = await SignupOtp.findOne({
    //   email,
    //   role: "fundraiser",
    //   verified: true,
    // });

    // if (!otpRecord) {
    //   return res.status(400).json({ message: "Please verify email first" });
    // }

    // already applied
    const existing = await Fundraiser.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Fundraiser already registered" });
    }

    let aadharCardUrl = "";
    let panCardUrl = "";

    try {
        if (req.files) {
            if (req.files.aadharCard && req.files.aadharCard[0]) {
                console.log("Uploading Aadhar Card...");
                aadharCardUrl = await uploadToCloudinary(req.files.aadharCard[0], "fundraiser-docs");
                console.log("Aadhar URL:", aadharCardUrl);
            }
            if (req.files.panCard && req.files.panCard[0]) {
                console.log("Uploading Pan Card...");
                panCardUrl = await uploadToCloudinary(req.files.panCard[0], "fundraiser-docs");
                console.log("Pan URL:", panCardUrl);
            }
        }
    } catch (uploadError) {
        console.error(" Cloudinary Upload Error:", uploadError);
        return res.status(500).json({ message: "File upload failed: " + uploadError.message });
    }

    const dummyPassword = await bcrypt.hash("Pending@123", 10);

    await Fundraiser.create({
      fullName,
      email,
      mobile,
      fundraiserType,
      reason,
      status: "pending",
      password: dummyPassword, 
      isPhoneVerified: isPhoneVerified === 'true' || isPhoneVerified === true,
      isEmailVerified: isEmailVerified === 'true' || isEmailVerified === true,
      aadharCard: aadharCardUrl,
      panCard: panCardUrl
    });

    try {
        const newNotification = await Notification.create({
            userType: "admin",
            message: `New fundraiser registration from ${fullName}.`,
            type: "fundraiser-registration",
            role: "fundraiser",
            read: false
        });

        const io = req.app.get("io");
        if (io) {
            io.to("admins").emit("admin-notification", newNotification);
        }
    } catch (notifyError) {
        console.error(" Notification Error:", notifyError);
    }

    return res.status(201).json({
      message: "Fundraiser registered, pending admin approval",
    });
  } catch (err) {
    console.error(" Register Fundraiser Controller Error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ================= ADMIN: GET ALL FUNDRAISERS =================
export const getFundraisers = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const fundraisers = await Fundraiser.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: fundraisers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= ADMIN: UPDATE STATUS (APPROVE/REJECT) =================
export const updateFundraiserStatus = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    const fundraiser = await Fundraiser.findById(id);
    if (!fundraiser) {
      return res.status(404).json({ message: "Fundraiser not found" });
    }

    let generatedPassword;

    if (status === "approved") {
      let user = await User.findOne({
        email: fundraiser.email,
        role: "fundraiser",
      });

      // 1. Generate Password ( Logic: Name@Last4Mobile)
      generatedPassword = generateFundraiserPassword(fundraiser.fullName, fundraiser.mobile);
      if (!generatedPassword) {
         generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }
      
      const hash = await bcrypt.hash(generatedPassword, 10);
      if (!user) {
        const cleanName = (fundraiser.fullName || "fundraiser").toLowerCase().replace(/\s+/g, "");
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        const memberId = `${cleanName}-${uniqueSuffix}`;

        user = await User.create({
          fullName: fundraiser.fullName,
          email: fundraiser.email,
          password: hash,
          role: "fundraiser",
          memberId,
          contactNumber: fundraiser.mobile,
          emailVerified: fundraiser.isEmailVerified,
          phoneVerified: fundraiser.isPhoneVerified,
          tempPassword: true,
          createdBy: adminId,
        });
      } else {
        user.password = hash;
        user.tempPassword = true;
        user.fullName = fundraiser.fullName;
        user.contactNumber = fundraiser.mobile;
        user.emailVerified = fundraiser.isEmailVerified;
        user.phoneVerified = fundraiser.isPhoneVerified;
        await user.save();
      }

      fundraiser.status = "approved";
      fundraiser.approvedBy = adminId;
      fundraiser.approvedAt = new Date();
      await fundraiser.save();

      // try {
      //     await sendFundraiserWelcomeEmail({
      //         toEmail: fundraiser.email,
      //         fullName: fundraiser.fullName,
      //         email: fundraiser.email,
      //         password: generatedPassword,
      //         memberId: user.memberId
      //     });
      // } catch (emailErr) {
      //     console.error("Failed to send welcome email:", emailErr);
      // }
    } else if (status === "rejected") {
        fundraiser.status = "rejected";
        fundraiser.adminRemark = adminRemark;

        // If rejecting after approval, remove the user to keep data clean
        const userToDelete = await User.findOne({ email: fundraiser.email, role: "fundraiser" });
        if (userToDelete) {
            await User.findByIdAndDelete(userToDelete._id);
        }
        await fundraiser.save();
    }

    return res.json({
      success: true,
      message: `Fundraiser request ${status} successfully`,
      generatedPassword: status === "approved" ? generatedPassword : undefined,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
