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

// ================= REGISTER FUNDRAISER (PENDING) =================
export const registerFundraiser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
      password,
      fundraiserType,
      reason,
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ⚠️ OTP Check removed because frontend has no OTP flow for this form yet.
    // Admin will verify details manually before approval.
    // const otpRecord = await SignupOtp.findOne({
    //   email,
    //   role: "fundraiser",
    //   verified: true,
    // });

    // if (!otpRecord) {
    //   return res.status(400).json({ message: "Please verify email first" });
    // }

    // ❌ already applied
    const existing = await Fundraiser.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Fundraiser already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    await Fundraiser.create({
      fullName,
      email,
      mobile,
      password: hash,
      fundraiserType,
      reason,
      status: "pending",
    });

    // cleanup OTP
    // await SignupOtp.deleteOne({ email, role: "fundraiser" });

    return res.status(201).json({
      message: "Fundraiser registered, pending admin approval",
    });
  } catch (err) {
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

    if (status === "approved") {
  const existingUser = await User.findOne({
    email: fundraiser.email,
    role: "fundraiser",
  });

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // ✅ memberId generate
  const cleanName = (fundraiser.fullName || "fundraiser")
    .toLowerCase()
    .replace(/\s+/g, "");

  const uniqueSuffix = Math.random().toString(36).substring(2, 6);
  const memberId = `${cleanName}-${uniqueSuffix}`;

  await User.create({
    fullName: fundraiser.fullName,
    email: fundraiser.email,
    password: fundraiser.password, // already hashed
    role: "fundraiser",             // ✅ now valid
    memberId,                       // ✅ MOST IMPORTANT
    contactNumber: fundraiser.mobile,
    emailVerified: true,
    createdBy: adminId,
  });

  fundraiser.status = "approved";
  fundraiser.approvedBy = adminId;
  fundraiser.approvedAt = new Date();
  await fundraiser.save();
}


    return res.json({
      success: true,
      message: `Fundraiser request ${status} successfully`,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
