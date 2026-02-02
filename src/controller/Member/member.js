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
import SignupOtp from "../../model/SignupOtp/SignupOtp.js";
import PhoneOtp from "../../model/PhoneOtp/PhoneOtp.js";

const logoPath = path.join(process.cwd(), "signatures", "orbosis.png");

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

    // 🔒 Verify Email OTP (Must be verified via /api/auth/signup/verify-otp)
    const emailOtpRecord = await SignupOtp.findOne({ email: body.email });
    if (!emailOtpRecord || emailOtpRecord.verified !== true) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please verify your email first.",
      });
    }

    // 🔒 Verify Phone OTP (Must be verified via /api/auth/verify-phone-otp)
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

    // Upload files to Cloudinary (Parallel Execution for Speed)
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
    console.log("Uploaded Profile Photo URL:", profilePhoto);

    if (!profilePhoto) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload profile photo",
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

    // ✅ Cleanup OTP records after successful registration
    await SignupOtp.deleteOne({ email: body.email });
    await PhoneOtp.deleteOne({ contactNumber: body.contactNumber });

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

// export const issueIdCard = async (req, res) => {
//   try {
//     const { id } = req.params;

//     let member = null;
//     if (mongoose.Types.ObjectId.isValid(id)) {
//       member = await Member.findById(id).lean();
//     }
//     if (!member) member = await Member.findOne({ memberId: id }).lean();

//     if (!member) {
//       return res.status(404).json({
//         success: false,
//         message: "Member not found",
//       });
//     }

//     // 🧾 Generate ID Card PDF (Buffer) - Stored in DB
//     const doc = new PDFDocument({ size: [325, 204], margin: 0 }); // ID Card size
//     const buffers = [];
//     doc.on("data", (chunk) => buffers.push(chunk));

//     // -- Professional Design --

//     // Profile Photo
//     // 1. Background
//     doc.rect(0, 0, 325, 204).fill("#FFFFFF");

//     // 2. Header Shape (Modern Curve)
//     doc.save();
//     doc.path("M 0 0 L 325 0 L 325 50 Q 162.5 80 0 50 Z");
//     doc.fill("#4F46E5"); // Indigo-600
//     doc.restore();

//     // 3. Organization Name
//     doc
//       .fillColor("#FFFFFF")
//       .fontSize(14)
//       .font("Helvetica-Bold")
//       .text("ORBOSIS FOUNDATION", 0, 20, {
//         align: "center",
//         characterSpacing: 1,
//       });

//     // 4. Profile Photo
//     const photoY = 65;
//     const photoSize = 70;
//     const photoX = 20;

//     if (member.profilePhoto) {
//       try {
//         const photoRes = await axios.get(member.profilePhoto, {
//           responseType: "arraybuffer",
//         });
//         const photoBuffer = Buffer.from(photoRes.data, "binary");
//         // Circular Mask
//         doc.save();
//         doc
//           .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
//           .clip();
//         doc.image(photoBuffer, photoX, photoY, {
//           cover: [photoSize, photoSize],
//           align: "center",
//           valign: "center",
//         });
//         doc.restore();

//         // Border
//         doc
//           .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
//           .lineWidth(2)
//           .strokeColor("#4F46E5")
//           .stroke();
//       } catch (e) {
//         console.error("Photo fetch failed:", e.message);
//         doc
//           .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
//           .lineWidth(1)
//           .strokeColor("#CCCCCC")
//           .stroke();
//       }
//     }

//     // 5. Member Details
//     const textX = 110;
//     let textY = 70;

//     doc
//       .fillColor("#111827")
//       .fontSize(12)
//       .font("Helvetica-Bold")
//       .text(member.fullName, textX, textY);
//     textY += 18;

//     // Footer
//     doc.rect(0, 184, 325, 20).fill("#f3f4f6");
//     doc
//       .fillColor("#4F46E5")
//       .fontSize(8)
//       .text("www.orbosisfoundation.org", 0, 190, { align: "center" });
//     doc.fontSize(9).font("Helvetica");

//     const addField = (label, value) => {
//       doc.fillColor("#6B7280").text(label, textX, textY, { continued: true });
//       doc.fillColor("#111827").text(`  ${value}`);
//       textY += 13;
//     };

//     addField("ID:", member.memberId);
//     addField("Role:", "Member");
//     addField("Phone:", member.contactNumber || "N/A");
//     addField("Joined:", new Date(member.createdAt).toLocaleDateString());

//     // 6. QR Code (For re-download/verification)
//     try {
//       const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
//       const qrData = `${baseUrl}/api/member/download-id-card/${member._id}?mode=download`;
//       const qrCodeDataUrl = await QRCode.toDataURL(qrData, { margin: 0 });
//       const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");

//       doc.image(qrBuffer, 250, 130, { width: 60, height: 60 });

//       doc
//         .fontSize(6)
//         .fillColor("#6B7280")
//         .text("Scan to Download", 250, 192, { width: 60, align: "center" });
//     } catch (qrErr) {
//       console.error("QR Generation failed:", qrErr);
//     }

//     // 7. Footer Accent
//     doc.rect(0, 200, 325, 4).fill("#4F46E5");

//     doc.end();

//     const pdfBuffer = await new Promise((resolve) => {
//       doc.on("end", () => resolve(Buffer.concat(buffers)));
//     });

//     // Save Buffer to DB
//     const updatedMember = await Member.findByIdAndUpdate(
//       member._id,
//       {
//         $set: {
//           idCardIssued: true,
//           idCardPDF: pdfBuffer, // Store binary
//           idCardIssueDate: new Date(),
//         },
//         $unset: { idCardUrl: 1 }, // Remove old URL field if exists
//       },
//       { new: true, strict: false },
//     ).lean();

//     // Create notification for member
//     try {
//       const user = await User.findOne({ email: member.email });
//       const targetUserId = user ? user._id : member._id;

//       const newNotification = await Notification.create({
//         userType: "member",
//         userId: targetUserId,
//         type: "id_card",
//         title: "ID Card Issued",
//         message:
//           "Your member ID card has been issued and is ready for download.",
//         redirectUrl: "/member-documents", // Redirect to documents page
//         read: false,
//       });

//       const io = req.app.get("io");
//       if (io) {
//         io.to(`user-${targetUserId}`).emit(
//           "user-notification",
//           newNotification,
//         );
//       }
//     } catch (notifErr) {
//       console.error("Notification creation failed:", notifErr);
//     }

//     return res.json({
//       success: true,
//       message: "ID Card Issued Successfully",
//       member: updatedMember,
//     });
//   } catch (err) {
//     console.error("issueIdCard ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };
export const issueIdCard = async (req, res) => {
  try {
    const { id } = req.params;
    let member =
      (await Member.findById(id)) || (await Member.findOne({ memberId: id }));

    if (!member)
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });

    // 🧾 Generate ID Card PDF (Buffer)
    const doc = new PDFDocument({ size: [325, 204], margin: 0 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    const bufferPromise = new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });

    // Register Fonts
    const fontPath = path.join(process.cwd(), "assets", "fonts");
    doc.registerFont(
      "OpenSans-Bold",
      path.join(fontPath, "open-sans.bold.ttf"),
    );
    doc.registerFont(
      "OpenSans-Regular",
      path.join(fontPath, "open-sans.regular.ttf"),
    );

    // -- Professional Design --

    // 1. Background
    doc.rect(0, 0, 325, 204).fill("#FFFFFF");

    // 2. Header Shape (Modern Curve)
    doc.save();
    doc.path("M 0 0 L 325 0 L 325 50 Q 162.5 80 0 50 Z");
    doc.fill("#4F46E5"); // Indigo-600
    doc.restore();

    // Logo
    if (logoPath && fs.existsSync(logoPath)) {
      doc.image(logoPath, 15, 10, { width: 35 });
    }

    // 3. Organization Name
    doc
      .fillColor("#FFFFFF")
      .fontSize(14)
      .font("OpenSans-Bold")
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
        // 🛠️ Fix: Ensure image is JPG/PNG (PDFKit doesn't support WebP)
        let photoUrl = member.profilePhoto;
        if (photoUrl.includes("cloudinary.com") && photoUrl.endsWith(".webp")) {
          photoUrl = photoUrl.replace(".webp", ".jpg");
        }

        const photoRes = await axios.get(photoUrl, {
          responseType: "arraybuffer",
        });
        const photoBuffer = Buffer.from(photoRes.data);

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
      .font("OpenSans-Bold")
      .text(member.fullName, textX, textY);
    textY += 18;

    // Footer
    doc.rect(0, 184, 325, 20).fill("#f3f4f6");
    doc
      .fillColor("#4F46E5")
      .fontSize(8)
      .text("www.orbosisfoundation.org", 0, 190, { align: "center" });
    doc.fontSize(9).font("OpenSans-Regular");

    const addField = (label, value) => {
      doc.fillColor("#6B7280").text(label, textX, textY, { continued: true });
      doc.fillColor("#111827").text(`  ${value}`);
      textY += 13;
    };

    addField("ID:", member.memberId);
    addField("Role:", "Member");
    addField("Phone:", member.contactNumber || "N/A");
    addField("Joined:", new Date(member.createdAt).toLocaleDateString());

    // 6. QR Code
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

    doc.end();

    const pdfBuffer = await bufferPromise;

    if (pdfBuffer.length === 0) {
      throw new Error("Generated PDF buffer is empty");
    }

    // 🔥 NEW: Upload to Cloudinary instead of just saving buffer
    let cloudinaryUrl = "";
    try {
      cloudinaryUrl = await uploadBufferToCloudinary(
        pdfBuffer,
        `ID_Card_${member.memberId}.pdf`,
        "member_docs/id_cards",
      );
    } catch (uploadErr) {
      console.error("Cloudinary Upload Failed:", uploadErr);
      // Fallback: Agar cloudinary fail ho toh buffer DB mein save ho jayega
    }

    // Save URL and Buffer to DB
    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      {
        $set: {
          idCardIssued: true,
          idCardCloudinaryUrl: cloudinaryUrl, // Cloudinary Link
          idCardPDF: pdfBuffer, // Fallback Buffer
          idCardIssueDate: new Date(),
        },
      },
      { new: true },
    ).lean();

    return res.json({
      success: true,
      message: "ID Card Issued on Cloudinary",
      url: cloudinaryUrl || "Generated locally",
      member: updatedMember,
    });
  } catch (err) {
    console.error("Issue ID Card Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// export const downloadIdCard = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { mode } = req.query; // 'preview' or 'download'

//     let member = null;
//     if (mongoose.Types.ObjectId.isValid(id)) {
//       member = await Member.findById(id).lean();
//     }
//     if (!member) member = await Member.findOne({ memberId: id }).lean();

//     if (!member) {
//       return res.status(404).json({
//         success: false,
//         message: "Member not found",
//       });
//     }

//     if (!member.idCardIssued || (!member.idCardPDF && !member.idCardUrl)) {
//       return res.status(400).json({
//         success: false,
//         message: "ID Card not generated yet",
//       });
//     }

//     // Serve from DB Buffer
//     const disposition = mode === "preview" ? "inline" : "attachment";
//     res.setHeader(
//       "Content-Disposition",
//       `${disposition}; filename="Member_ID_${member.memberId}.pdf"`,
//     );
//     res.setHeader("Content-Type", "application/pdf");

//     // Handle Binary (BSON) or Buffer
//     const bufferData =
//       member.idCardPDF && member.idCardPDF.buffer
//         ? member.idCardPDF.buffer
//         : member.idCardPDF;

//     if (bufferData) {
//       return res.send(bufferData);
//     } else if (member.idCardUrl) {
//       // Fallback for old cards
//       return res.redirect(member.idCardUrl);
//     }

//     return res
//       .status(404)
//       .json({ success: false, message: "ID Card data missing" });
//   } catch (err) {
//     console.error("downloadIdCard ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };
export const downloadIdCard = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findById(id).lean();

    if (!member) return res.status(404).json({ message: "Not found" });

    // 1. Cloudinary Priority
    if (member.idCardCloudinaryUrl) {
      return res.redirect(member.idCardCloudinaryUrl);
    }

    // 2. Static/Buffer Fallback
    if (member.idCardPDF) {
      res.setHeader("Content-Type", "application/pdf");
      const buffer = member.idCardPDF.buffer || member.idCardPDF;
      return res.send(buffer);
    }

    // 3. Absolute Fallback (Static File if nothing works)
    return res.redirect("/assets/static/id-card-sample.pdf");
  } catch (err) {
    res.status(500).json({ success: false, message: "Error" });
  }
};
export const issueAppointmentLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, startDate, address } = req.body || {};

    let member = (await Member.findById(id)) || (await Member.findOne({ memberId: id }));

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    const fontPath = path.join(process.cwd(), "assets", "fonts");
    // Fonts registration (keeping your existing logic)
    doc.registerFont("GreatVibes", path.join(fontPath, "GreatVibes-Regular.ttf"));
    doc.registerFont("Playfair-Bold", path.join(fontPath, "playfair-display.bold.ttf"));
    doc.registerFont("OpenSans-Regular", path.join(fontPath, "open-sans.regular.ttf"));
    doc.registerFont("OpenSans-Bold", path.join(fontPath, "open-sans.bold.ttf"));
    doc.registerFont("DancingScript", path.join(fontPath, "dancing-script.regular.ttf"));

    const PRIMARY = "#4F46E5";
    const GOLD = "#D4AF37";
    const TEXT_MAIN = "#1F2937";
    const TEXT_LIGHT = "#6B7280";

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // --- NEW ALIGNMENT CONSTANTS ---
    const PAGE_MARGIN = 50; 
    const RIGHT_BOUNDARY = pageWidth - PAGE_MARGIN; // 545 approx
    const LEFT_BOUNDARY = PAGE_MARGIN;
    const RIGHT_COL_WIDTH = 200; // Right side text boxes ki width

    // 1. Background & Border (Keeping your 20 margin for border)
    doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");
    const borderMargin = 20;
    doc.lineWidth(3).strokeColor(PRIMARY).rect(borderMargin, borderMargin, pageWidth - borderMargin * 2, pageHeight - borderMargin * 2).stroke();
    doc.lineWidth(1).strokeColor(GOLD).rect(borderMargin + 6, borderMargin + 6, pageWidth - (borderMargin * 2 + 12), pageHeight - (borderMargin * 2 + 12)).stroke();

    // 2. Header
    if (fs.existsSync(logoPath)) { doc.image(logoPath, LEFT_BOUNDARY, 45, { width: 50 }); }

    doc.font("Playfair-Bold").fontSize(24).fillColor(PRIMARY).text("ORBOSIS FOUNDATION", LEFT_BOUNDARY + 60, 45);
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_LIGHT).text("Empowering Communities, Transforming Lives", LEFT_BOUNDARY + 60, 75);

    // Fixed Contact Info (Right Aligned)
    const contactX = RIGHT_BOUNDARY - RIGHT_COL_WIDTH;
    doc.font("OpenSans-Regular").fontSize(9).fillColor(TEXT_MAIN);
    doc.text("123 NGO Street, Social City", contactX, 45, { align: "right", width: RIGHT_COL_WIDTH });
    doc.text("India - 452001", contactX, 58, { align: "right", width: RIGHT_COL_WIDTH });
    doc.text("contact@orbosis.org", contactX, 71, { align: "right", width: RIGHT_COL_WIDTH });
    doc.text("+91 98765 43210", contactX, 84, { align: "right", width: RIGHT_COL_WIDTH });

    // Divider Line (Dynamic Length)
    doc.moveTo(LEFT_BOUNDARY, 105).lineTo(RIGHT_BOUNDARY, 105).lineWidth(1).strokeColor(GOLD).stroke();

    // 3. Ref No & Date
    let currentY = 135;
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    doc.font("OpenSans-Bold").fontSize(10).fillColor(TEXT_MAIN).text(`Ref No: OF/MEM/${member.memberId}`, LEFT_BOUNDARY, currentY);
    doc.text(`Date: ${today}`, RIGHT_BOUNDARY - RIGHT_COL_WIDTH, currentY, { width: RIGHT_COL_WIDTH, align: "right" });

    // 4. Recipient Details
    currentY += 40;
    const recipientName = name || member.fullName || "Member";
    doc.font("OpenSans-Bold").fontSize(11).text("To,", LEFT_BOUNDARY, currentY);
    currentY += 20;
    doc.font("Playfair-Bold").fontSize(14).fillColor(PRIMARY).text(recipientName, LEFT_BOUNDARY, currentY);
    currentY += 22;
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_MAIN).text((address || member.address || "Address not provided"), LEFT_BOUNDARY, currentY, { width: 250 });

    // 5. Subject
    currentY += 60;
    doc.font("OpenSans-Bold").fontSize(12).fillColor(TEXT_MAIN).text("SUBJECT: APPOINTMENT LETTER", 0, currentY, { align: "center", underline: true });

    // 6. Body Content
    currentY += 50;
    const startDateStr = new Date(startDate || member.approvedAt || new Date()).toLocaleDateString("en-GB");
    const bodyOptions = { align: "justify", width: pageWidth - (PAGE_MARGIN * 2), lineGap: 5 };

    doc.font("OpenSans-Regular").fontSize(11).text(`Dear ${recipientName},`, LEFT_BOUNDARY, currentY);
    currentY += 30;
    doc.text(`We are pleased to inform you that you have been appointed as a ${role || "Member"} of Orbosis Foundation, effective from ${startDateStr}. We were very impressed with your background and believe that your skills and experience will be a valuable asset to our organization.`, LEFT_BOUNDARY, currentY, bodyOptions);
    
    currentY = doc.y + 15;
    doc.text("As a member, you will play a vital role in our mission to empower communities and transform lives. We look forward to your active participation and contribution to our various initiatives and programs.", LEFT_BOUNDARY, currentY, bodyOptions);
    
    currentY = doc.y + 15;
    doc.text("This appointment is subject to the rules and regulations of the foundation. We trust that you will perform your duties with the highest level of integrity and dedication.", LEFT_BOUNDARY, currentY, bodyOptions);

    // 7. Signatures (Balanced)
    currentY = doc.y + 60;
    const sigY = currentY;

    // Left Signature
    doc.font("OpenSans-Bold").fontSize(10).text("Accepted By:", LEFT_BOUNDARY, sigY);
    doc.font("DancingScript").fontSize(18).text(recipientName, LEFT_BOUNDARY, sigY + 25);
    doc.font("OpenSans-Regular").fontSize(10).text(`(${recipientName})`, LEFT_BOUNDARY, sigY + 50);

    // Right Signature (Fixed Aligment)
    const rightSigX = RIGHT_BOUNDARY - RIGHT_COL_WIDTH;
    doc.font("OpenSans-Bold").fontSize(10).text("For Orbosis Foundation", rightSigX, sigY, { width: RIGHT_COL_WIDTH, align: "right" });
    doc.font("DancingScript").fontSize(20).text("Authorized Signatory", rightSigX, sigY + 25, { width: RIGHT_COL_WIDTH, align: "right" });
    doc.font("OpenSans-Regular").fontSize(10).text("Authorized Signatory", rightSigX, sigY + 50, { width: RIGHT_COL_WIDTH, align: "right" });

    // 8. Footer
    const footerY = pageHeight - 50;
    doc.lineWidth(1).strokeColor(GOLD).moveTo(LEFT_BOUNDARY, footerY).lineTo(RIGHT_BOUNDARY, footerY).stroke();
    doc.font("OpenSans-Regular").fontSize(9).fillColor(TEXT_LIGHT).text("www.orbosisfoundation.org | Reg. No: 12345/2023", 0, footerY + 10, { align: "center" });

    doc.end();
    const pdfBuffer = await new Promise((resolve) => { doc.on("end", () => resolve(Buffer.concat(buffers))); });

    // ... baaki ka Cloudinary aur Database logic (same as before)
    let cloudinaryUrl = await uploadBufferToCloudinary(pdfBuffer, `Appointment_Letter_${member.memberId}`, "member_docs/appointment_letters");

    await Member.findByIdAndUpdate(member._id, { $set: { appointmentLetterIssued: true, appointmentLetterCloudinaryUrl: cloudinaryUrl, appointmentLetterPDF: pdfBuffer, appointmentLetterDate: new Date() } });

    return res.json({ success: true, message: "Appointment Letter issued successfully", url: cloudinaryUrl });

  } catch (err) {
    console.error("issueAppointmentLetter ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
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

    // Generate Certificate PDF (Buffer)
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margin: 0,
    });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    // ═══════════════════════════════════════════════════════════
    // REGISTER FONTS
    // ═══════════════════════════════════════════════════════════
    const fontPath = path.join(process.cwd(), "assets", "fonts");
    doc.registerFont(
      "GreatVibes",
      path.join(fontPath, "GreatVibes-Regular.ttf"),
    );
    doc.registerFont(
      "Playfair-Bold",
      path.join(fontPath, "playfair-display.bold.ttf"),
    );
    doc.registerFont(
      "Playfair-Regular",
      path.join(fontPath, "playfair-display.regular.ttf"),
    );
    doc.registerFont(
      "OpenSans-Regular",
      path.join(fontPath, "open-sans.regular.ttf"),
    );
    doc.registerFont(
      "OpenSans-Bold",
      path.join(fontPath, "open-sans.bold.ttf"),
    );
    doc.registerFont(
      "DancingScript",
      path.join(fontPath, "dancing-script.regular.ttf"),
    );

    // --- DESIGN ---
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    // Colors
    const PRIMARY = "#4F46E5"; // Indigo-600
    const GOLD = "#D4AF37";
    const TEXT_MAIN = "#1F2937"; // Gray-800
    const TEXT_LIGHT = "#6B7280"; // Gray-500

    // 1. Background & Border
    doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");

    // Double Border
    const margin = 20;
    doc
      .lineWidth(3)
      .strokeColor(PRIMARY)
      .rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)
      .stroke();
    doc
      .lineWidth(1)
      .strokeColor(GOLD)
      .rect(
        margin + 6,
        margin + 6,
        pageWidth - (margin * 2 + 12),
        pageHeight - (margin * 2 + 12),
      )
      .stroke();

    // Corner Decorations
    doc.save();
    doc.fillColor(PRIMARY).opacity(0.1);
    doc.moveTo(0, 0).lineTo(150, 0).lineTo(0, 150).fill();
    doc
      .moveTo(pageWidth, pageHeight)
      .lineTo(pageWidth - 150, pageHeight)
      .lineTo(pageWidth, pageHeight - 150)
      .fill();
    doc.restore();

    // 2. Logo
    let currentY = 60;

    if (fs.existsSync(logoPath)) {
      const logoWidth = 80;
      doc.image(logoPath, centerX - logoWidth / 2, currentY, {
        width: logoWidth,
      });
      currentY += 90;
    } else {
      currentY += 50;
    }

    // Organization Name
    doc
      .font("OpenSans-Bold")
      .fontSize(16)
      .fillColor(PRIMARY)
      .text("ORBOSIS FOUNDATION", 0, currentY, {
        align: "center",
        characterSpacing: 2,
      });
    currentY += 25;

    // Tagline
    doc
      .font("OpenSans-Regular")
      .fontSize(10)
      .fillColor(TEXT_LIGHT)
      .text("Empowering Communities, Transforming Lives", 0, currentY, {
        align: "center",
        characterSpacing: 1,
      });
    currentY += 50;

    // 3. Title
    doc
      .font("GreatVibes")
      .fontSize(50)
      .fillColor(GOLD)
      .text("Certificate of Membership", 0, currentY, { align: "center" });
    currentY += 65;

    // 4. Body Text
    doc
      .font("OpenSans-Regular")
      .fontSize(12)
      .fillColor(TEXT_MAIN)
      .text("This is to certify that", 0, currentY, { align: "center" });
    currentY += 35;

    // Member Name
    doc
      .font("Playfair-Bold")
      .fontSize(32)
      .fillColor(PRIMARY)
      .text(member.fullName.toUpperCase(), 0, currentY, { align: "center" });

    // Underline name
    const nameWidth = doc.widthOfString(member.fullName.toUpperCase());
    doc
      .lineWidth(1)
      .strokeColor(GOLD)
      .moveTo(centerX - nameWidth / 2 - 20, currentY + 40)
      .lineTo(centerX + nameWidth / 2 + 20, currentY + 40)
      .stroke();

    currentY += 55;

    // Description
    doc
      .font("OpenSans-Regular")
      .fontSize(12)
      .fillColor(TEXT_MAIN)
      .text(
        "has been officially admitted as a registered member of the Orbosis Foundation.\nWe appreciate your dedication towards our cause.",
        100,
        currentY,
        { align: "center", width: pageWidth - 200, lineGap: 5 },
      );

    currentY += 60;

    // 5. Details Box
    let iDate = issueDate ? new Date(issueDate) : new Date();
    if (isNaN(iDate.getTime())) iDate = new Date();

    const dateStr = iDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Generate Unique Certificate Code
    const certCode = `CERT-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    const detailsY = pageHeight - 130;

    // Left Side: Date
    doc
      .font("OpenSans-Bold")
      .fontSize(10)
      .fillColor(TEXT_MAIN)
      .text("DATE ISSUED", 120, detailsY);
    doc
      .font("OpenSans-Regular")
      .fontSize(10)
      .fillColor(TEXT_LIGHT)
      .text(dateStr, 120, detailsY + 15);

    // Right Side: Certificate ID
    doc
      .font("OpenSans-Bold")
      .fontSize(10)
      .fillColor(TEXT_MAIN)
      .text("CERTIFICATE ID", pageWidth - 220, detailsY);
    doc
      .font("OpenSans-Regular")
      .fontSize(10)
      .fillColor(TEXT_LIGHT)
      .text(certCode, pageWidth - 220, detailsY + 15);

    // Center: Member ID
    doc
      .font("OpenSans-Bold")
      .fontSize(10)
      .fillColor(TEXT_MAIN)
      .text("MEMBER ID", centerX - 30, detailsY);
    doc
      .font("OpenSans-Regular")
      .fontSize(10)
      .fillColor(TEXT_LIGHT)
      .text(member.memberId, centerX - 30, detailsY + 15);

    // 6. Signatures
    const sigY = pageHeight - 70;

    // Left Signature Line
    doc
      .lineWidth(1)
      .strokeColor(TEXT_LIGHT)
      .moveTo(120, sigY)
      .lineTo(270, sigY)
      .stroke();
    doc
      .font("OpenSans-Bold")
      .fontSize(10)
      .fillColor(TEXT_MAIN)
      .text("AUTHORIZED SIGNATORY", 120, sigY + 10, {
        width: 150,
        align: "center",
      });

    // Right Signature Line
    doc
      .lineWidth(1)
      .strokeColor(TEXT_LIGHT)
      .moveTo(pageWidth - 270, sigY)
      .lineTo(pageWidth - 120, sigY)
      .stroke();
    doc
      .font("OpenSans-Bold")
      .fontSize(10)
      .fillColor(TEXT_MAIN)
      .text("DIRECTOR", pageWidth - 270, sigY + 10, {
        width: 150,
        align: "center",
      });

    // Fake Signatures (Script font)
    doc
      .font("DancingScript")
      .fontSize(20)
      .fillColor(TEXT_MAIN)
      .opacity(0.8)
      .text("Orbosis Admin", 140, sigY - 35);
    doc
      .font("DancingScript")
      .fontSize(20)
      .fillColor(TEXT_MAIN)
      .opacity(0.8)
      .text("Director Name", pageWidth - 250, sigY - 35);
    doc.opacity(1);

    const pdfBufferPromise = new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });

    doc.end();
    const pdfBuffer = await pdfBufferPromise;

    // 🔥 NEW: Upload to Cloudinary instead of just saving buffer
    let cloudinaryUrl = "";
    try {
      cloudinaryUrl = await uploadBufferToCloudinary(
        pdfBuffer,
        `Membership_Certificate_${member.memberId}`,
        "member_docs/certificates",
      );
    } catch (uploadErr) {
      console.error("Cloudinary Upload Failed:", uploadErr);
    }

    // Save to DB
    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      {
        $set: {
          membershipCertificateIssued: true,
          membershipCertificateCloudinaryUrl: cloudinaryUrl,
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

    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // 1. Cloudinary Priority
    if (member.membershipCertificateCloudinaryUrl) {
      return res.redirect(member.membershipCertificateCloudinaryUrl);
    }

    // 2. Buffer Fallback
    if (member.membershipCertificatePDF) {
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
    }

    return res
      .status(404)
      .json({ success: false, message: "Certificate not found" });
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

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Appointment letter not found",
      });
    }

    // 1. Cloudinary Priority
    if (member.appointmentLetterCloudinaryUrl) {
      return res.redirect(member.appointmentLetterCloudinaryUrl);
    }

    // Serve from DB Buffer
    if (member.appointmentLetterPDF || member.appointmentLetterUrl) {
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
    }

    return res
      .status(404)
      .json({ success: false, message: "Appointment letter not found" });
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
        // 🛡️ Security: Prevent overwriting Admin accounts
        if (existingUser.role === "admin") {
          return res.status(400).json({
            success: false,
            message: "Cannot approve member linked to an Admin email.",
          });
        }
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
            { $set: { userId: user._id } },
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
            io.to(`user-${user._id}`).emit(
              "user-notification",
              newNotification,
            );
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

    if (files && files.profilePhoto) {
      const result = await cloudinary.uploader.upload(
        files.profilePhoto[0].path,
        {
          folder: "members",
          resource_type: "auto",
        },
      );
      updateData.profilePhoto = result.secure_url;
    }

    if (files && files.governmentIdProof) {
      const result = await cloudinary.uploader.upload(
        files.governmentIdProof[0].path,
        {
          folder: "members",
          resource_type: "auto",
        },
      );
      updateData.governmentIdProof = result.secure_url;
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
const uploadBufferToCloudinary = (buffer, fileName, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
        public_id: fileName,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    uploadStream.end(buffer);
  });
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
      const result = await cloudinary.uploader.upload(
        req.files.profilePhoto[0].path,
        {
          folder: "members",
          resource_type: "auto",
        },
      );
      updateData.profilePhoto = result.secure_url;
    }

    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      { $set: updateData },
      { new: true },
    );

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
