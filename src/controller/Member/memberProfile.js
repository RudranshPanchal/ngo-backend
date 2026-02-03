import Member from "../../model/Member/member.js";
import User from "../../model/Auth/auth.js";
import Notification from "../../model/Notification/notification.js";
import { sendEmail } from "../../utils/mail.js";
import SignupOtp from "../../model/SignupOtp/SignupOtp.js";
import PhoneOtp from "../../model/PhoneOtp/PhoneOtp.js";
import cloudinary from "../../config/cloudinary.js";

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
    console.log("Register Member - Files:", req.files);
    console.log("Register Member - Body:", req.body);

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

    // 🔒 Verify Email OTP
    const emailOtpRecord = await SignupOtp.findOne({ email: body.email });
    if (!emailOtpRecord || emailOtpRecord.verified !== true) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please verify your email first.",
      });
    }

    // 🔒 Verify Phone OTP
    const phoneOtpRecord = await PhoneOtp.findOne({ contactNumber: body.contactNumber });
    if (!phoneOtpRecord || phoneOtpRecord.verified !== true) {
      return res.status(400).json({
        success: false,
        message: "Phone number not verified. Please verify your phone number first.",
      });
    }

    // profile photo is mandatory
    if (!req.files?.profilePhoto?.[0]) {
      return res.status(400).json({
        success: false,
        message: "Profile photo is required",
      });
    }

    // Upload files to Cloudinary
    const uploadFile = async (file) => {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "members",
        resource_type: "auto",
      });
      return result.secure_url;
    };

    const uploadPromises = [uploadFile(req.files.profilePhoto[0])];

    if (req.files.governmentIdProof?.[0]) {
      uploadPromises.push(uploadFile(req.files.governmentIdProof[0]));
    } else {
      uploadPromises.push(Promise.resolve(""));
    }

    const [profilePhoto, governmentIdProof] = await Promise.all(uploadPromises);

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

    // ✅ Cleanup OTP records
    await SignupOtp.deleteOne({ email: body.email });
    await PhoneOtp.deleteOne({ contactNumber: body.contactNumber });

    // 🔔 NOTIFICATION
    try {
      const newNotification = await Notification.create({
        userType: "admin",
        title: "New Member Registration",
        message: `New Member registered: ${member.fullName}`,
        type: "registration",
        role: "Member",
        read: false,
      });

      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("admin-notification", newNotification);
      }
    } catch (notifyErr) {
      console.error("Notification Error:", notifyErr.message);
    }

    sendEmail(
      member.email,
      "Membership Application Received",
      `Thank you ${member.fullName}. Your ID: ${member.memberId}`,
    ).catch((e) => console.error("Email sending failed:", e));

    return res.status(201).json({
      success: true,
      member,
    });
  } catch (err) {
    console.error("registerMember ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "member") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const member = await Member.findOne({ email: user.email }).lean();

    if (!member) {
      return res.status(404).json({ success: false, message: "Member profile not found" });
    }

    return res.json({ success: true, member });
  } catch (err) {
    console.error("getMyProfile ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
