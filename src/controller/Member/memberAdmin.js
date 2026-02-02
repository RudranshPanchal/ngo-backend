import Member from "../../model/Member/member.js";
import User from "../../model/Auth/auth.js";
import Notification from "../../model/Notification/notification.js";
import { sendEmail, sendMemberWelcomeEmail } from "../../utils/mail.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";

const generateMemberPassword = (name, mobile) => {
  if (!name || !mobile) return null;
  const cleanName = String(name).replace(/\s+/g, "");
  const namePart = cleanName.substring(0, 3).toLowerCase();
  const mobileStr = String(mobile);
  if (mobileStr.length < 4) return null;
  const last4 = mobileStr.slice(-4);
  return `${namePart}@${last4}`;
};

export const getAllMembers = async (req, res) => {
  try {
    console.log("📢 Fetching all members...");
    const members = await Member.find().sort({ createdAt: -1 });
    res.json({ success: true, members });
  } catch (err) {
    console.error("❌ getAllMembers Error:", err);
    res.status(500).json({ success: false, members: [] });
  }
};

export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id).lean();
    }
    if (!member) member = await Member.findOne({ memberId: id }).lean();

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    return res.json({ success: true, member });
  } catch (err) {
    console.error("getMemberById ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const approveMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    if (member.status === "approved") {
      return res.json({ success: true, member });
    }
    member.status = "approved";
    member.approvedAt = new Date();
    await member.save();
    try {
      await sendEmail(member.email, "Membership Approved", "Your membership has been approved.");
    } catch (e) {}
    res.json({ success: true, member });
  } catch (err) {
    console.error("approveMember ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    let { password } = req.body;

    if (!id) return res.status(400).json({ success: false, message: "Missing id" });

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id);
    }
    if (!member) {
      member = await Member.findOne({ memberId: id });
    }

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (!["approved", "rejected", "blocked"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    member.status = status;
    if (status === "approved") {
      member.approvedAt = new Date();
      if (!member.memberId) {
        member.memberId = `MEM${Date.now()}`;
      }
    }
    if (status === "rejected") member.rejectionReason = reason;

    await member.save();

    if (status === "blocked" || status === "approved") {
      const user = await User.findOne({ email: member.email });
      if (user) {
        user.isBlocked = status === "blocked";
        await user.save();
      }
    }

    if (status === "approved") {
      if (!password) password = generateMemberPassword(member.fullName, member.contactNumber);
      if (!password) password = `MEM${Math.floor(100000 + Math.random() * 900000)}`;

      const hash = await bcrypt.hash(password, 10);
      const existingUser = await User.findOne({ email: member.email });

      if (existingUser) {
        if (existingUser.role === "admin") {
          return res.status(400).json({ success: false, message: "Cannot approve member linked to an Admin email." });
        }
        existingUser.password = hash;
        existingUser.role = "member";
        existingUser.memberId = member.memberId;
        existingUser.tempPassword = false;
        existingUser.emailVerified = true;
        existingUser.phoneVerified = true;
        await existingUser.save();
      } else {
        await User.create({
          fullName: member.fullName,
          email: member.email,
          password: hash,
          role: "member",
          memberId: member.memberId,
          contactNumber: member.contactNumber || "",
          address: member.address || "",
          emailVerified: true,
          phoneVerified: true,
          tempPassword: false,
        });
      }

      try {
        await sendMemberWelcomeEmail({
          toEmail: member.email,
          fullName: member.fullName,
          email: member.email,
          password,
          memberId: member.memberId,
        });
      } catch (e) { console.error("Email error", e); }

      try {
        const user = await User.findOne({ email: member.email });
        if (user) {
          await Notification.updateMany({ userId: member._id, userType: "member" }, { $set: { userId: user._id } });
          const newNotification = await Notification.create({
            userType: "member",
            userId: user._id,
            type: "membership_approved",
            title: "Membership Approved",
            message: "Congratulations! Your membership has been approved.",
            redirectUrl: "/member-dashboard",
            read: false,
          });
          const io = req.app.get("io");
          if (io) io.to(`user-${user._id}`).emit("user-notification", newNotification);
        }
      } catch (notifErr) { console.error("Approval Notification Error:", notifErr); }
    } else if (status === "rejected") {
      try {
        await sendEmail(member.email, "❌ Your Membership Application is Rejected", `Hello ${member.fullName},\n\nYour membership application has been REJECTED.\nReason: ${reason}`);
      } catch (e) { console.error("Email error", e); }
    }

    return res.json({ success: true, member, generatedPassword: status === "approved" ? password : null });
  } catch (err) {
    console.error("updateMemberStatus ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const updateMemberProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { address, area, state, pinCode, profession } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== "member") return res.status(403).json({ success: false, message: "Unauthorized" });
    const member = await Member.findOne({ email: user.email });
    if (!member) return res.status(404).json({ success: false, message: "Member profile not found" });

    const updateData = {};
    if (address !== undefined) updateData.address = address;
    if (area !== undefined) updateData.area = area;
    if (state !== undefined) updateData.state = state;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (profession !== undefined) updateData.profession = profession;

    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      const result = await cloudinary.uploader.upload(req.files.profilePhoto[0].path, { folder: "members", resource_type: "auto" });
      updateData.profilePhoto = result.secure_url;
    }
    const updatedMember = await Member.findByIdAndUpdate(member._id, { $set: updateData }, { new: true });
    res.json({ success: true, message: "Profile updated successfully", member: updatedMember });
  } catch (err) {
    console.error("updateMemberProfile ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const updateMemberDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;
    if (!id) return res.status(400).json({ success: false, message: "Member ID is required" });
    let updateData = {};
    if (files && files.profilePhoto) { const result = await cloudinary.uploader.upload(files.profilePhoto[0].path, { folder: "members", resource_type: "auto" }); updateData.profilePhoto = result.secure_url; }
    if (files && files.governmentIdProof) { const result = await cloudinary.uploader.upload(files.governmentIdProof[0].path, { folder: "members", resource_type: "auto" }); updateData.governmentIdProof = result.secure_url; }
    const updatedMember = await Member.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updatedMember) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, message: "Documents uploaded successfully", data: updatedMember });
  } catch (error) { console.error("Error uploading member docs:", error); res.status(500).json({ success: false, message: "Server error" }); }
};