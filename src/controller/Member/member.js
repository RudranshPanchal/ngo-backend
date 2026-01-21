import Member from "../../model/Member/member.js";
import User from "../../model/Auth/auth.js";
import Certificate from "../../model/Certificate/certificate.js";
import Notification from "../../model/Notification/notification.js";
import { sendEmail, sendMemberWelcomeEmail } from "../../utils/mail.js";
import { generateIdCard } from "../../utils/generateIdCard.js";
import { uploadToCloudinary } from "../../utils/uploader.js";
import bcrypt from "bcrypt";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const generateMemberPassword = (name, mobile) => {
  if (!name || !mobile) return null;

  const cleanName = String(name).replace(/\s+/g, "");
  const namePart = cleanName.substring(0, 3).toLowerCase();

  const mobileStr = String(mobile);
  if (mobileStr.length < 4) return null;
  const last4 = mobileStr.slice(-4);

  return `${namePart}@${last4}`;
};

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

    // profile photo is mandatory
    if (!req.files?.profilePhoto?.[0]) {
      return res.status(400).json({
        success: false,
        message: "Profile photo is required",
      });
    }

    // Upload files to Cloudinary (Parallel Execution for Speed)
    const uploadPromises = [
      uploadToCloudinary(req.files.profilePhoto[0], "members"),
    ];

    if (req.files.governmentIdProof?.[0]) {
      uploadPromises.push(
        uploadToCloudinary(req.files.governmentIdProof[0], "members"),
      );
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

    // 🔔 SAVE & SEND NOTIFICATION (Updated Logic)
    try {
      // 1. Database mein save karo
      const newNotification = await Notification.create({
        userType: "admin",
        title: "New Member Registration",
        message: `New Member registered: ${member.fullName}`,
        type: "registration",
        role: "Member",
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

    // Send Email (Non-blocking to reduce response time)
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

export const issueIdCard = async (req, res) => {
  try {
    const { id } = req.params;

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id).lean();
    }
    if (!member) member = await Member.findOne({ memberId: id }).lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // 🧾 Generate ID Card PDF (Buffer) - Stored in DB
    const doc = new PDFDocument({ size: [325, 204], margin: 0 }); // ID Card size
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    // -- Professional Design --

    // Profile Photo
    // 1. Background
    doc.rect(0, 0, 325, 204).fill("#FFFFFF");

    // 2. Header Shape (Modern Curve)
    doc.save();
    doc.path("M 0 0 L 325 0 L 325 50 Q 162.5 80 0 50 Z");
    doc.fill("#4F46E5"); // Indigo-600
    doc.restore();

    // 3. Organization Name
    doc
      .fillColor("#FFFFFF")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("ORBOSIS FOUNDATION", 0, 20, {
        align: "center",
        characterSpacing: 1,
      });

    // 4. Profile Photo
    const photoY = 65;
    const photoSize = 70;
    const photoX = 20;

    if (member.profilePhoto) {
      try {
        const photoRes = await axios.get(member.profilePhoto, {
          responseType: "arraybuffer",
        });
        const photoBuffer = Buffer.from(photoRes.data, "binary");
        // Circular Mask
        doc.save();
        doc
          .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
          .clip();
        doc.image(photoBuffer, photoX, photoY, {
          cover: [photoSize, photoSize],
          align: "center",
          valign: "center",
        });
        doc.restore();

        // Border
        doc
          .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
          .lineWidth(2)
          .strokeColor("#4F46E5")
          .stroke();
      } catch (e) {
        console.error("Photo fetch failed:", e.message);
        doc
          .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
          .lineWidth(1)
          .strokeColor("#CCCCCC")
          .stroke();
      }
    }

    // 5. Member Details
    const textX = 110;
    let textY = 70;

    doc
      .fillColor("#111827")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(member.fullName, textX, textY);
    textY += 18;

    // Footer
    doc.rect(0, 184, 325, 20).fill("#f3f4f6");
    doc
      .fillColor("#4F46E5")
      .fontSize(8)
      .text("www.orbosisfoundation.org", 0, 190, { align: "center" });
    doc.fontSize(9).font("Helvetica");

    const addField = (label, value) => {
      doc.fillColor("#6B7280").text(label, textX, textY, { continued: true });
      doc.fillColor("#111827").text(`  ${value}`);
      textY += 13;
    };

    addField("ID:", member.memberId);
    addField("Role:", "Member");
    addField("Phone:", member.contactNumber || "N/A");
    addField("Joined:", new Date(member.createdAt).toLocaleDateString());

    // 6. QR Code (For re-download/verification)
    try {
      const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
      const qrData = `${baseUrl}/api/member/download-id-card/${member._id}?mode=download`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, { margin: 0 });
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");

      doc.image(qrBuffer, 250, 130, { width: 60, height: 60 });

      doc
        .fontSize(6)
        .fillColor("#6B7280")
        .text("Scan to Download", 250, 192, { width: 60, align: "center" });
    } catch (qrErr) {
      console.error("QR Generation failed:", qrErr);
    }

    // 7. Footer Accent
    doc.rect(0, 200, 325, 4).fill("#4F46E5");

    // Website
    doc
      .fillColor("#4F46E5")
      .fontSize(8)
      .text("www.orbosisfoundation.org", 20, 185);

    doc.end();

    const pdfBuffer = await new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });

    // Save Buffer to DB
    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      {
        $set: {
          idCardIssued: true,
          idCardPDF: pdfBuffer, // Store binary
          idCardIssueDate: new Date(),
        },
        $unset: { idCardUrl: 1 }, // Remove old URL field if exists
      },
      { new: true, strict: false },
    ).lean();

    // Create notification for member
    try {
      const user = await User.findOne({ email: member.email });
      const targetUserId = user ? user._id : member._id;

      const newNotification = await Notification.create({
        userType: "member",
        userId: targetUserId,
        type: "id_card",
        title: "ID Card Issued",
        message:
          "Your member ID card has been issued and is ready for download.",
        redirectUrl: "/member-documents", // Redirect to documents page
        read: false,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user-${targetUserId}`).emit(
          "user-notification",
          newNotification,
        );
      }
    } catch (notifErr) {
      console.error("Notification creation failed:", notifErr);
    }

    return res.json({
      success: true,
      message: "ID Card Issued Successfully",
      member: updatedMember,
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
    const { mode } = req.query; // 'preview' or 'download'

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id).lean();
    }
    if (!member) member = await Member.findOne({ memberId: id }).lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (!member.idCardIssued || (!member.idCardPDF && !member.idCardUrl)) {
      return res.status(400).json({
        success: false,
        message: "ID Card not generated yet",
      });
    }

    // Serve from DB Buffer
    const disposition = mode === "preview" ? "inline" : "attachment";
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="Member_ID_${member.memberId}.pdf"`,
    );
    res.setHeader("Content-Type", "application/pdf");

    // Handle Binary (BSON) or Buffer
    const bufferData =
      member.idCardPDF && member.idCardPDF.buffer
        ? member.idCardPDF.buffer
        : member.idCardPDF;

    if (bufferData) {
      return res.send(bufferData);
    } else if (member.idCardUrl) {
      // Fallback for old cards
      return res.redirect(member.idCardUrl);
    }

    return res
      .status(404)
      .json({ success: false, message: "ID Card data missing" });
  } catch (err) {
    console.error("downloadIdCard ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const issueAppointmentLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, startDate, address } = req.body;

    let member =
      (await Member.findById(id)) || (await Member.findOne({ memberId: id }));

    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // 🧾 Generate Appointment Letter PDF (Buffer) - Stored in DB
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    // --- DESIGN CONSTANTS ---
    const primaryColor = "#4F46E5"; // Indigo-600 (Matches ID Card)
    const secondaryColor = "#111827"; // Gray-900
    const accentColor = "#6B7280"; // Gray-500
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // 1. Header Background
    doc.rect(0, 0, pageWidth, 120).fill(primaryColor);

    // 2. Organization Name & Logo (Text based for now)
    doc
      .fillColor("#FFFFFF")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("ORBOSIS FOUNDATION", 50, 45, { align: "left" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Empowering Communities, Transforming Lives", 50, 80, {
        align: "left",
      });

    // Contact Info in Header (Right side)
    doc
      .fontSize(9)
      .text("123 NGO Street, Social City", 350, 45, {
        align: "right",
        width: 200,
      })
      .text("India - 452001", 350, 58, { align: "right", width: 200 })
      .text("contact@orbosis.org", 350, 71, { align: "right", width: 200 })
      .text("+91 98765 43210", 350, 84, { align: "right", width: 200 });

    // 3. Watermark (Faint)
    doc.save();
    doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
    doc
      .fontSize(60)
      .fillColor("#F3F4F6") // Very light gray
      .opacity(0.5)
      .text("ORBOSIS FOUNDATION", 50, pageHeight / 2, {
        align: "center",
        width: pageWidth,
      });
    doc.restore();

    // Reset position for body
    doc.y = 160;
    doc.fillColor(secondaryColor).opacity(1);

    // 4. Ref No & Date
    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text(`Ref No: OF/MEM/${member.memberId}`, 50, doc.y);
    doc.text(`Date: ${today}`, 400, doc.y - 10, { align: "right" }); // Adjust Y to align

    doc.moveDown(2);

    // 5. Recipient Details
    const recipientName = name || member.fullName || "Member";
    const recipientAddress =
      address || member.address || "Address not provided";

    doc.fontSize(11).font("Helvetica-Bold").text("To,", 50);
    doc.text(recipientName);
    doc.font("Helvetica").fontSize(10).text(recipientAddress, { width: 250 });

    doc.moveDown(2);

    // 6. Subject
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("SUBJECT: APPOINTMENT LETTER", {
        align: "center",
        underline: true,
      });

    doc.moveDown(2);

    // 7. Salutation
    doc.font("Helvetica").fontSize(11).text(`Dear ${recipientName},`, 50);
    doc.moveDown();

    // 8. Body Content
    let startDateStr;
    if (startDate) {
      startDateStr = new Date(startDate).toLocaleDateString("en-GB");
    } else {
      startDateStr = member.approvedAt
        ? new Date(member.approvedAt).toLocaleDateString("en-GB")
        : new Date().toLocaleDateString("en-GB");
    }
    const recipientRole = role || "Member";

    const bodyOptions = { align: "justify", lineGap: 4, width: 500 };

    doc.text(
      `We are pleased to inform you that you have been appointed as a ${recipientRole} of Orbosis Foundation, effective from ${startDateStr}. We were very impressed with your background and believe that your skills and experience will be a valuable asset to our organization.`,
      bodyOptions,
    );
    doc.moveDown();

    doc.text(
      "As a member, you will play a vital role in our mission to empower communities and transform lives. We look forward to your active participation and contribution to our various initiatives and programs.",
      bodyOptions,
    );
    doc.moveDown();

    doc.text(
      "This appointment is subject to the rules and regulations of the foundation. We trust that you will perform your duties with the highest level of integrity and dedication.",
      bodyOptions,
    );
    doc.moveDown(3);

    // 9. Signatures
    const sigY = doc.y;

    // Left Signature
    doc.font("Helvetica-Bold").text("Accepted By:", 50, sigY);
    doc.font("Helvetica").text(`(${recipientName})`, 50, sigY + 40);

    // Right Signature
    doc
      .font("Helvetica-Bold")
      .text("For Orbosis Foundation", 350, sigY, { align: "right" });
    doc
      .font("Helvetica")
      .text("Authorized Signatory", 350, sigY + 40, { align: "right" });

    // 10. Footer
    const footerY = pageHeight - 50;
    doc.rect(0, footerY, pageWidth, 50).fill("#F3F4F6"); // Light gray footer background
    doc
      .fillColor(primaryColor)
      .fontSize(9)
      .text("www.orbosisfoundation.org", 0, footerY + 20, { align: "center" });

    doc.end();

    const pdfBuffer = await new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });

    // Update database with Buffer
    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      {
        $set: {
          appointmentLetterIssued: true,
          appointmentLetterPDF: pdfBuffer,
          appointmentLetterDate: new Date(),
        },
        $unset: { appointmentLetterUrl: 1 }, // Remove old URL
      },
      { new: true, strict: false },
    ).lean();

    // Create notification with redirect URL
    try {
      const user = await User.findOne({ email: member.email });
      const targetUserId = user ? user._id : member._id;

      const newNotification = await Notification.create({
        userType: "member",
        userId: targetUserId,
        type: "appointment_letter",
        title: "Appointment Letter Issued",
        message: `Your appointment letter has been issued and is ready for download.`,
        redirectUrl: "/member-documents", // Redirect to documents page
        read: false,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user-${targetUserId}`).emit(
          "user-notification",
          newNotification,
        );
      }
    } catch (notifErr) {
      console.error("Notification creation failed:", notifErr);
    }

    return res.json({
      success: true,
      message: "Appointment Letter issued successfully",
      member: updatedMember,
    });
  } catch (err) {
    console.error("issueAppointmentLetter ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const issueMembershipCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    // Admin can optionally pass a specific date, otherwise use current date
    const { issueDate } = req.body || {};

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id);
    }
    if (!member) {
      member = await Member.findOne({ memberId: id });
    }

    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // 🧾 Generate Certificate PDF (Buffer)
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margin: 50,
    });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    // --- DESIGN ---
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    // 1. Ornamental Border
    doc
      .rect(20, 20, pageWidth - 40, pageHeight - 40)
      .lineWidth(5)
      .strokeColor("#D4AF37") // Gold
      .stroke();

    doc
      .rect(28, 28, pageWidth - 56, pageHeight - 56)
      .lineWidth(1)
      .strokeColor("#1f2937")
      .stroke();

    // 2. Header / Logo Placeholder
    doc.moveDown(2);
    doc
      .font("Helvetica-Bold")
      .fontSize(30)
      .fillColor("#4c1d95") // Purple
      .text("ORBOSIS FOUNDATION", { align: "center" });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#6b7280")
      .text("Empowering Communities, Transforming Lives", {
        align: "center",
        characterSpacing: 2,
      });

    doc.moveDown(2.5);

    // 3. Title
    doc
      .font("Helvetica-Bold")
      .fontSize(36)
      .fillColor("#D4AF37") // Gold Title
      .text("CERTIFICATE OF MEMBERSHIP", { align: "center" });

    doc.moveDown(1.5);

    // 4. Body Text
    doc
      .font("Helvetica")
      .fontSize(14)
      .fillColor("#1f2937")
      .text("This is to certify that", { align: "center" });

    doc.moveDown(0.8);

    // Member Name
    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor("#111827")
      .text(member.fullName, { align: "center" });

    doc.moveDown(0.8);

    doc
      .font("Helvetica")
      .fontSize(14)
      .fillColor("#1f2937")
      .text(
        "has been officially admitted as a registered member of the Orbosis Foundation.",
        { align: "center" },
      );

    doc.moveDown(2);

    // 5. Details Box
    const detailsY = doc.y;
    doc.fontSize(12).fillColor("#4b5563");

    let iDate = issueDate ? new Date(issueDate) : new Date();
    if (isNaN(iDate.getTime())) iDate = new Date();

    const dateStr = iDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.text(`Membership ID: ${member.memberId}`, centerX - 200, detailsY, {
      align: "left",
    });
    doc.text(`Issue Date: ${dateStr}`, centerX + 50, detailsY, {
      align: "left",
    });

    doc.moveDown(4);

    // 6. Signatures
    const sigY = pageHeight - 100;

    doc.lineWidth(1).strokeColor("#9ca3af");
    doc.moveTo(100, sigY).lineTo(300, sigY).stroke();
    doc
      .moveTo(pageWidth - 300, sigY)
      .lineTo(pageWidth - 100, sigY)
      .stroke();

    doc.fontSize(10).fillColor("#1f2937");
    doc.text("Authorized Signatory", 100, sigY + 10, {
      width: 200,
      align: "center",
    });
    doc.text("Director", pageWidth - 300, sigY + 10, {
      width: 200,
      align: "center",
    });

    doc.end();

    const pdfBuffer = await new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });

    // Save to DB
    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      {
        $set: {
          membershipCertificateIssued: true,
          membershipCertificatePDF: pdfBuffer,
          membershipCertificateDate: iDate,
        },
      },
      { new: true, strict: false },
    ).lean();

    // Notification
    try {
      const user = await User.findOne({ email: member.email });
      const targetUserId = user ? user._id : member._id;

      const newNotification = await Notification.create({
        userType: "member",
        userId: targetUserId,
        type: "certificate",
        title: "Membership Certificate Issued",
        message: "Your official membership certificate has been issued.",
        redirectUrl: "/member-documents", // Redirect to documents page
        read: false,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user-${targetUserId}`).emit(
          "user-notification",
          newNotification,
        );
      }
    } catch (e) {
      console.error("Notification error", e);
    }

    return res.json({
      success: true,
      message: "Membership Certificate issued successfully",
      member: updatedMember,
    });
  } catch (err) {
    console.error("issueMembershipCertificate ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const downloadMembershipCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode } = req.query; // 'preview' or 'download'

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id).lean();
    }
    if (!member) member = await Member.findOne({ memberId: id }).lean();

    if (!member || !member.membershipCertificatePDF) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    const disposition = mode === "preview" ? "inline" : "attachment";
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="Membership_Certificate_${member.memberId}.pdf"`,
    );
    res.setHeader("Content-Type", "application/pdf");

    const bufferData = member.membershipCertificatePDF.buffer
      ? member.membershipCertificatePDF.buffer
      : member.membershipCertificatePDF;
    return res.send(bufferData);
  } catch (err) {
    console.error("DOWNLOAD CERT ERROR:", err);
    return res.status(500).json({ success: false, message: "Download failed" });
  }
};
export const downloadAppointmentLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode } = req.query; // 'preview' or 'download'

    let member = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      member = await Member.findById(id).lean();
    }
    if (!member) member = await Member.findOne({ memberId: id }).lean();

    if (
      !member ||
      (!member.appointmentLetterPDF && !member.appointmentLetterUrl)
    ) {
      return res.status(404).json({
        success: false,
        message: "Appointment letter not found",
      });
    }

    // Serve from DB Buffer
    const disposition = mode === "preview" ? "inline" : "attachment";
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="Appointment_Letter_${member.memberId}.pdf"`,
    );
    res.setHeader("Content-Type", "application/pdf");

    const bufferData =
      member.appointmentLetterPDF && member.appointmentLetterPDF.buffer
        ? member.appointmentLetterPDF.buffer
        : member.appointmentLetterPDF;

    if (bufferData) {
      return res.send(bufferData);
    } else if (member.appointmentLetterUrl) {
      // Fallback for old letters
      return res.redirect(member.appointmentLetterUrl);
    }
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to download appointment letter",
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
        "Your membership has been approved.",
      );
    } catch (e) {}

    res.json({ success: true, member });
  } catch (err) {
    console.error("approveMember ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = req.user; // auth middleware se

    if (!user || user.role !== "member") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const member = await Member.findOne({ email: user.email }).lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member profile not found",
      });
    }

    return res.json({
      success: true,
      member,
    });
  } catch (err) {
    console.error("getMyProfile ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* GET ALL*/
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
    const { status, reason } = req.body;
    let { password } = req.body;

    if (!id)
      return res.status(400).json({ success: false, message: "Missing id" });
    let member = await Member.findById(id);
    if (!member) {
      member = await Member.findOne({ memberId: id });
    }


    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    if (!["approved", "rejected", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Update status
    member.status = status;
    if (status === "approved") {
      member.approvedAt = new Date();
      if (!member.memberId) {
        member.memberId = `MEM${Date.now()}`;
      }
    }
    if (status === "rejected") member.rejectionReason = reason;

    await member.save();

    // ... baaki ka aapka code (User account creation, Email logic etc.)
    // (Jaisa pehle tha waisa hi rehne dein)
    if (status === "blocked" || status === "approved") {
      const user = await User.findOne({ email: member.email });
      if (user) {
        user.isBlocked = status === "blocked";
        await user.save();
      }
    }
    // 🟢 IF APPROVED & PASSWORD PROVIDED -> CREATE USER ACCOUNT
    if (status === "approved") {
      // Generate password if not provided
      if (!password) {
        password = generateMemberPassword(
          member.fullName,
          member.contactNumber,
        );
      }

      // 🛡️ Fallback if password generation failed (e.g. missing contact number)
      if (!password) {
        password = `MEM${Math.floor(100000 + Math.random() * 900000)}`;
      }

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
          memberId: member.memberId,
          contactNumber: member.contactNumber || "",
          address: member.address || "",
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

      // 🔔 Send Notification & Migrate Orphaned Notifications
      try {
        const user = await User.findOne({ email: member.email });
        if (user) {
          // 1. Migrate any notifications sent to member._id (before user creation)
          await Notification.updateMany(
            { userId: member._id, userType: "member" },
            { $set: { userId: user._id } }
          );

          // 2. Send Approval Notification
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
          if (io) {
            io.to(`user-${user._id}`).emit("user-notification", newNotification);
          }
        }
      } catch (notifErr) {
        console.error("Approval Notification Error:", notifErr);
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

    return res.json({
      success: true,
      member,
      generatedPassword: status === "approved" ? password : null,
    });
  } catch (err) {
    console.error("updateMemberStatus ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
export const updateMemberDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Member ID is required" });
    }

    let updateData = {};

    // 1. Profile Photo Upload Logic
    if (files && files.profilePhoto) {
      updateData.profilePhoto = await uploadToCloudinary(
        files.profilePhoto[0],
        "members",
      );
    }

    // 2. Government ID Proof Upload Logic
    if (files && files.governmentIdProof) {
      updateData.governmentIdProof = await uploadToCloudinary(
        files.governmentIdProof[0],
        "members",
      );
    }

    const updatedMember = await Member.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!updatedMember) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully",
      data: updatedMember,
    });
  } catch (error) {
    console.error("Error uploading member docs:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateMemberProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; // From auth middleware
    const { address, area, state, pinCode, profession } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== "member") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const member = await Member.findOne({ email: user.email });
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member profile not found" });
    }

    const updateData = {};
    if (address !== undefined) updateData.address = address;
    if (area !== undefined) updateData.area = area;
    if (state !== undefined) updateData.state = state;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (profession !== undefined) updateData.profession = profession;

    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      const profilePhotoUrl = await uploadToCloudinary(req.files.profilePhoto[0], "members");
      if (profilePhotoUrl) updateData.profilePhoto = profilePhotoUrl;
    }

    const updatedMember = await Member.findByIdAndUpdate(member._id, { $set: updateData }, { new: true });

    res.json({
      success: true,
      message: "Profile updated successfully",
      member: updatedMember,
    });
  } catch (err) {
    console.error("updateMemberProfile ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
