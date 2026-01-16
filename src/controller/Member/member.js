import Member from "../../model/Member/member.js";
import User from "../../model/Auth/auth.js";
import Notification from "../../model/Notification/notification.js";
import { sendEmail, sendMemberWelcomeEmail } from "../../utils/mail.js";
import { generateIdCard } from "../../utils/generateIdCard.js";
import bcrypt from "bcrypt";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import mongoose from "mongoose";

function normalizeBody(raw) {
  const body = { ...raw };

  if (!body.contactNumber && body.phoneNumber)
    body.contactNumber = body.phoneNumber;

  if (!body.pinCode && body.pincode) body.pinCode = body.pincode;

  if (body.typesOfSupport && typeof body.typesOfSupport === "string") {
    body.typesOfSupport = body.typesOfSupport
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (body.age) {
    const n = Number(body.age);
    body.age = Number.isFinite(n) ? n : body.age;
  }

  return body;
}

//REGISTER
export const registerMember = async (req, res) => {
  try {
    console.log("Register Member - Files:", req.files); // Check karein file aa rahi hai ya nahi
    console.log("Register Member - Body:", req.body); // Check karein baaki data

    const body = normalizeBody(req.body);

    const required = [
      "fullName",
      "gender",
      "age",
      "contactNumber",
      "email",
      "address",
    ];

    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    const profilePhoto = req.files?.profilePhoto?.[0]?.path;
    const governmentIdProof = req.files?.governmentIdProof?.[0]?.path;

    // profile photo is mandatory
    if (!profilePhoto) {
      return res.status(400).json({
        success: false,
        message: "Profile photo is required",
      });
    }

    //  PREVENT DUPLICATE REGISTRATION
    const exists = await Member.findOne({ email: body.email });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Member with this email already exists",
      });
    }

    const member = await Member.create({
      fullName: body.fullName,
      gender: body.gender,
      age: Number(body.age),
      contactNumber: body.contactNumber,
      email: body.email,
      address: body.address,
      area: body.area || "",
      state: body.state || "",
      pinCode: body.pinCode || "",
      typesOfSupport: body.typesOfSupport || [],
      specialRequirement: body.specialRequirement || "",
      governmentIdProof: governmentIdProof || "",
      profilePhoto: profilePhoto,
      status: "pending",
    });

    // 🔔 SAVE & SEND NOTIFICATION (Updated Logic)
    try {
      // 1. Database mein save karo
      const newNotification = await Notification.create({
        userType: "admin",
        title: "New Member Registration",
        message: `New Member registered: ${member.fullName}`,
        type: "registration",
        role: "member",
        read: false,
      });

      // 2. Real-time Admin ko bhejo
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("admin-notification", newNotification);
      }
    } catch (notifyErr) {
      console.error("Notification Error:", notifyErr.message);
    }

    try {
      await sendEmail(
        member.email,
        "Membership Application Received",
        `Thank you ${member.fullName}. Your ID: ${member.memberId}`
      );
    } catch (e) {
      // ignore mail failure
    }

    return res.status(201).json({
      success: true,
      member,
    });
  } catch (err) {
    console.error("registerMember ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// export const issueIdCard = async (req, res) => {
//   try {
//     const { id } = req.params;

//     let member = null;
//     if (mongoose.Types.ObjectId.isValid(id)) {
//       member = await Member.findById(id);
//     }
//     if (!member) member = await Member.findOne({ memberId: id });

//     if (!member) {
//       return res.status(404).json({ success: false, message: "Member not found" });
//     }

//     member.idCardIssued = true;
//     member.idCardIssueDate = new Date();
//     await member.save();

//     return res.json({ success: true, message: "ID Card Issued Successfully", member });
//   } catch (err) {

//   }
// };

// export const issueIdCard = async (req, res) => {
//   try {
//     const { id } = req.params;

//     let member = null;
//     if (mongoose.Types.ObjectId.isValid(id)) {
//       member = await Member.findById(id);
//     }
//     if (!member) member = await Member.findOne({ memberId: id });

//     if (!member) {
//       return res.status(404).json({ success: false, message: "Member not found" });
//     }

//     member.idCardIssued = true;
//     member.idCardIssueDate = new Date();
//     member.idCardUrl = pdfUrl;
//     await member.save();

//     return res.json({ success: true, message: "ID Card Issued Successfully", member });
//   } catch (err) {
//     console.error("issueIdCard ERROR:", err);
//     return res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// };
export const issueIdCard = async (req, res) => {
  try {
    const { id } = req.params;

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id);
    }
    if (!member) member = await Member.findOne({ memberId: id });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // 🔒 Prevent re-issue
    if (member.idCardIssued && member.idCardUrl) {
      return res.json({
        success: true,
        message: "ID Card already issued",
        member,
      });
    }

    // 🧾 Generate ID Card PDF
    member.idCardIssueDate = new Date();
    const pdfUrl = await generateIdCard(member);

    member.idCardIssued = true;
    member.idCardUrl = pdfUrl;

    await member.save();

    return res.json({
      success: true,
      message: "ID Card Issued Successfully",
      member,
    });
  } catch (err) {
    console.error("issueIdCard ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

export const downloadIdCard = async (req, res) => {
  try {
    const { id } = req.params;

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id);
    }
    if (!member) member = await Member.findOne({ memberId: id });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (!member.idCardIssued || !member.idCardUrl) {
      return res.status(400).json({
        success: false,
        message: "ID Card not generated yet",
      });
    }

    // 🔁 Redirect to static PDF
    return res.redirect(member.idCardUrl);
  } catch (err) {
    console.error("downloadIdCard ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* APPROVE  */
export const approveMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findById(id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    if (member.status === "approved") {
      return res.json({ success: true, member });
    }

    member.status = "approved";
    member.approvedAt = new Date();
    await member.save();

    try {
      await sendEmail(
        member.email,
        "Membership Approved",
        "Your membership has been approved."
      );
    } catch (e) {}

    res.json({ success: true, member });
  } catch (err) {
    console.error("approveMember ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* GET ALL*/
export const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, members: [] });
  }
};

export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id);
    }
    if (!member) member = await Member.findOne({ memberId: id });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.json({
      success: true,
      member,
    });
  } catch (err) {
    console.error("getMemberById ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, password } = req.body;

    if (!id)
      return res.status(400).json({ success: false, message: "Missing id" });

    const member = await Member.findById(id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Update status
    member.status = status;
    if (status === "approved") member.approvedAt = new Date();
    if (status === "rejected") member.rejectionReason = reason;
    await member.save();

    // 🟢 IF APPROVED & PASSWORD PROVIDED -> CREATE USER ACCOUNT
    if (status === "approved" && password) {
      const hash = await bcrypt.hash(password, 10);

      const existingUser = await User.findOne({ email: member.email });

      if (existingUser) {
        // If user exists, update password to allow login with new credentials
        existingUser.password = hash;
        existingUser.role = "member";
        existingUser.memberId = member.memberId;
        existingUser.tempPassword = false;
        existingUser.emailVerified = true;
        existingUser.phoneVerified = true;
        await existingUser.save();
      } else {
        // Create new User
        await User.create({
          fullName: member.fullName,
          email: member.email,
          password: hash,
          role: "member",
          memberId: member.memberId || `MEM${Date.now()}`,
          contactNumber: member.contactNumber,
          address: member.address,
          emailVerified: true,
          phoneVerified: true,
          tempPassword: false,
        });
      }

      // Send Welcome Email
      try {
        await sendMemberWelcomeEmail({
          toEmail: member.email,
          fullName: member.fullName,
          email: member.email,
          password,
          memberId: member.memberId,
        });
      } catch (e) {
        console.error("Email error", e);
      }
    } else if (status === "rejected") {
      // Rejection email
      const subject = "❌ Your Membership Application is Rejected";
      const message = `
Hello ${member.fullName},

Your membership application has been REJECTED.

Reason:
${reason}

If you believe this is a mistake, you may contact our support team.
`;
      try {
        await sendEmail(member.email, subject, message);
      } catch (e) {
        console.error("Email error", e);
      }
    }

    return res.json({ success: true, member });
  } catch (err) {
    console.error("updateMemberStatus ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const updateMemberProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { address, area, state, pinCode, profession } = req.body;
    const profilePhoto = req.file?.path;

    const user = await User.findById(userId);
    if (!user || user.role !== "member") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const member = await Member.findOne({ email: user.email });
    if (!member) {
      return res.status(404).json({ success: false, message: "Member profile not found" });
    }

    // Update only allowed fields
    if (address) member.address = address;
    if (area) member.area = area;
    if (state) member.state = state;
    if (pinCode) member.pinCode = pinCode;
    if (profession) member.profession = profession;
    if (profilePhoto) member.profilePhoto = profilePhoto;

    await member.save();
    res.json({ success: true, message: "Profile updated successfully", member });
  } catch (err) {
    console.error("updateMemberProfile ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
// import Member from "../../model/Member/member.js";
// import User from "../../model/Auth/auth.js";
// import Notification from "../../model/Notification/notification.js";
// import { sendEmail, sendMemberWelcomeEmail } from "../../utils/mail.js";
// import { generateIdCard } from "../../utils/generateIdCard.js";
// import bcrypt from "bcrypt";
// import mongoose from "mongoose";

// /* ================= HELPERS ================= */

// function normalizeBody(raw) {
//   const body = { ...raw };

//   if (!body.contactNumber && body.phoneNumber)
//     body.contactNumber = body.phoneNumber;

//   if (!body.pinCode && body.pincode) body.pinCode = body.pincode;

//   if (body.typesOfSupport && typeof body.typesOfSupport === "string") {
//     body.typesOfSupport = body.typesOfSupport
//       .split(",")
//       .map((s) => s.trim())
//       .filter(Boolean);
//   }

//   if (body.age) {
//     const n = Number(body.age);
//     body.age = Number.isFinite(n) ? n : body.age;
//   }

//   return body;
// }

// /* ================= REGISTER ================= */

// export const registerMember = async (req, res) => {
//   try {
//     const body = normalizeBody(req.body);

//     const required = [
//       "fullName",
//       "gender",
//       "age",
//       "contactNumber",
//       "email",
//       "address",
//     ];

//     const missing = required.filter((k) => !body[k]);
//     if (missing.length) {
//       return res.status(400).json({
//         success: false,
//         message: `Missing required fields: ${missing.join(", ")}`,
//       });
//     }

//     const profilePhoto = req.files?.profilePhoto?.[0]?.path;
//     const governmentIdProof = req.files?.governmentIdProof?.[0]?.path;

//     if (!profilePhoto) {
//       return res.status(400).json({
//         success: false,
//         message: "Profile photo is required",
//       });
//     }

//     const exists = await Member.findOne({ email: body.email });
//     if (exists) {
//       return res.status(409).json({
//         success: false,
//         message: "Member with this email already exists",
//       });
//     }

//     const member = await Member.create({
//       ...body,
//       profilePhoto,
//       governmentIdProof: governmentIdProof || "",
//       status: "pending",
//     });

//     await Notification.create({
//       userType: "admin",
//       title: "New Member Registration",
//       message: `New Member registered: ${member.fullName}`,
//       type: "registration",
//       read: false,
//     });

//     try {
//       await sendEmail(
//         member.email,
//         "Membership Application Received",
//         `Thank you ${member.fullName}. Your ID: ${member.memberId}`
//       );
//     } catch {}

//     return res.status(201).json({ success: true, member });
//   } catch (err) {
//     console.error("registerMember ERROR:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// /* ================= ISSUE ID CARD ================= */

// export const issueIdCard = async (req, res) => {
//   try {
//     const { id } = req.params;

//     let member = mongoose.Types.ObjectId.isValid(id)
//       ? await Member.findById(id)
//       : await Member.findOne({ memberId: id });

//     if (!member) {
//       return res.status(404).json({
//         success: false,
//         message: "Member not found",
//       });
//     }

//     if (member.idCardIssued && member.idCardUrl) {
//       return res.json({
//         success: true,
//         message: "ID Card already issued",
//         member,
//       });
//     }

//     member.idCardIssueDate = new Date();
//     const pdfUrl = await generateIdCard(member);

//     member.idCardIssued = true;
//     member.idCardUrl = pdfUrl;
//     await member.save();

//     return res.json({
//       success: true,
//       message: "ID Card Issued Successfully",
//       member,
//     });
//   } catch (err) {
//     console.error("issueIdCard ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// /* ================= DOWNLOAD ID CARD ================= */

// export const downloadIdCard = async (req, res) => {
//   try {
//     const { id } = req.params;

//     let member = mongoose.Types.ObjectId.isValid(id)
//       ? await Member.findById(id)
//       : await Member.findOne({ memberId: id });

//     if (!member || !member.idCardIssued || !member.idCardUrl) {
//       return res.status(400).json({
//         success: false,
//         message: "ID Card not available",
//       });
//     }

//     return res.redirect(member.idCardUrl);
//   } catch (err) {
//     console.error("downloadIdCard ERROR:", err);
//     return res.status(500).json({ success: false });
//   }
// };

// /* ================= APPROVE MEMBER ================= */

// export const approveMember = async (req, res) => {
//   try {
//     const { id, password } = req.body;

//     const member = await Member.findById(id);
//     if (!member) {
//       return res.status(404).json({ success: false });
//     }

//     member.status = "approved";
//     member.approvedAt = new Date();
//     await member.save();

//     if (password) {
//       const hash = await bcrypt.hash(password, 10);
//       await User.create({
//         fullName: member.fullName,
//         email: member.email,
//         password: hash,
//         role: "member",
//         memberId: member.memberId,
//       });

//       await sendMemberWelcomeEmail({
//         toEmail: member.email,
//         fullName: member.fullName,
//         email: member.email,
//         password,
//         memberId: member.memberId,
//       });
//     }

//     res.json({ success: true, member });
//   } catch (err) {
//     console.error("approveMember ERROR:", err);
//     res.status(500).json({ success: false });
//   }
// };
