import Member from "../../model/Member/member.js";
import User from "../../model/Auth/auth.js";
import Notification from "../../model/Notification/notification.js";
import { uploadBufferWithPublicId } from "../../utils/uploader.js";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";

const logoPath = path.join(process.cwd(), "signatures", "orbosis.png");

export const issueIdCard = async (req, res) => {
  try {
    const { id } = req.params;
    let member = (await Member.findById(id)) || (await Member.findOne({ memberId: id }));

    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    const doc = new PDFDocument({ size: [325, 204], margin: 0 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    const bufferPromise = new Promise((resolve) => { doc.on("end", () => resolve(Buffer.concat(buffers))); });

    const fontPath = path.join(process.cwd(), "assets", "fonts");
    doc.registerFont("OpenSans-Bold", path.join(fontPath, "open-sans.bold.ttf"));
    doc.registerFont("OpenSans-Regular", path.join(fontPath, "open-sans.regular.ttf"));

    doc.rect(0, 0, 325, 204).fill("#FFFFFF");
    doc.save();
    doc.path("M 0 0 L 325 0 L 325 50 Q 162.5 80 0 50 Z");
    doc.fill("#4F46E5");
    doc.restore();

    if (logoPath && fs.existsSync(logoPath)) { doc.image(logoPath, 15, 10, { width: 35 }); }

    doc.fillColor("#FFFFFF").fontSize(14).font("OpenSans-Bold").text("ORBOSIS FOUNDATION", 0, 20, { align: "center", characterSpacing: 1 });

    const photoY = 65; const photoSize = 70; const photoX = 20;
    if (member.profilePhoto) {
      try {
        let photoUrl = member.profilePhoto;
        if (photoUrl.includes("cloudinary.com") && photoUrl.endsWith(".webp")) { photoUrl = photoUrl.replace(".webp", ".jpg"); }
        const photoRes = await axios.get(photoUrl, { responseType: "arraybuffer" });
        const photoBuffer = Buffer.from(photoRes.data);
        doc.save();
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).clip();
        doc.image(photoBuffer, photoX, photoY, { cover: [photoSize, photoSize], align: "center", valign: "center" });
        doc.restore();
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).lineWidth(2).strokeColor("#4F46E5").stroke();
      } catch (e) { console.error("Photo fetch failed:", e.message); }
    }

    const textX = 110; let textY = 70;
    doc.fillColor("#111827").fontSize(12).font("OpenSans-Bold").text(member.fullName, textX, textY);
    textY += 18;

    doc.rect(0, 184, 325, 20).fill("#f3f4f6");
    doc.fillColor("#4F46E5").fontSize(8).text("www.orbosisfoundation.org", 0, 190, { align: "center" });
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

    try {
      const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
      const qrData = `${baseUrl}/api/member/download-id-card/${member._id}?mode=download`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, { margin: 0 });
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
      doc.image(qrBuffer, 250, 130, { width: 60, height: 60 });
      doc.fontSize(6).fillColor("#6B7280").text("Scan to Download", 250, 192, { width: 60, align: "center" });
    } catch (qrErr) { console.error("QR Generation failed:", qrErr); }

    doc.rect(0, 200, 325, 4).fill("#4F46E5");
    doc.end();

    const pdfBuffer = await bufferPromise;
    if (pdfBuffer.length === 0) throw new Error("Generated PDF buffer is empty");

    let cloudinaryUrl = "";
    try {
      cloudinaryUrl = await uploadBufferWithPublicId(pdfBuffer, `ID_Card_${member.memberId}.pdf`, "member_docs/id_cards");
    } catch (uploadErr) { console.error("Cloudinary Upload Failed:", uploadErr); }

    const updatedMember = await Member.findByIdAndUpdate(member._id, {
      $set: { idCardIssued: true, idCardCloudinaryUrl: cloudinaryUrl, idCardPDF: pdfBuffer, idCardIssueDate: new Date() },
    }, { new: true }).lean();

    return res.json({ success: true, message: "ID Card Issued on Cloudinary", url: cloudinaryUrl || "Generated locally", member: updatedMember });
  } catch (err) {
    console.error("Issue ID Card Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const downloadIdCard = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findById(id).lean();
    if (!member) return res.status(404).json({ message: "Not found" });
    if (member.idCardCloudinaryUrl) return res.redirect(member.idCardCloudinaryUrl);
    if (member.idCardPDF) {
      res.setHeader("Content-Type", "application/pdf");
      const buffer = member.idCardPDF.buffer || member.idCardPDF;
      return res.send(buffer);
    }
    return res.redirect("/assets/static/id-card-sample.pdf");
  } catch (err) { res.status(500).json({ success: false, message: "Error" }); }
};

export const issueAppointmentLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, startDate, address } = req.body || {};
    let member = (await Member.findById(id)) || (await Member.findOne({ memberId: id }));
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    const fontPath = path.join(process.cwd(), "assets", "fonts");
    doc.registerFont("Playfair-Bold", path.join(fontPath, "playfair-display.bold.ttf"));
    doc.registerFont("OpenSans-Regular", path.join(fontPath, "open-sans.regular.ttf"));
    doc.registerFont("OpenSans-Bold", path.join(fontPath, "open-sans.bold.ttf"));
    doc.registerFont("DancingScript", path.join(fontPath, "dancing-script.regular.ttf"));

    const PRIMARY = "#4F46E5"; const GOLD = "#D4AF37"; const TEXT_MAIN = "#1F2937"; const TEXT_LIGHT = "#6B7280";
    const pageWidth = doc.page.width; const pageHeight = doc.page.height;
    const PAGE_MARGIN = 50; const RIGHT_BOUNDARY = pageWidth - PAGE_MARGIN; const LEFT_BOUNDARY = PAGE_MARGIN; const RIGHT_COL_WIDTH = 200;

    doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");
    const borderMargin = 20;
    doc.lineWidth(3).strokeColor(PRIMARY).rect(borderMargin, borderMargin, pageWidth - borderMargin * 2, pageHeight - borderMargin * 2).stroke();
    doc.lineWidth(1).strokeColor(GOLD).rect(borderMargin + 6, borderMargin + 6, pageWidth - (borderMargin * 2 + 12), pageHeight - (borderMargin * 2 + 12)).stroke();

    if (fs.existsSync(logoPath)) { doc.image(logoPath, LEFT_BOUNDARY, 45, { width: 50 }); }
    doc.font("Playfair-Bold").fontSize(24).fillColor(PRIMARY).text("ORBOSIS FOUNDATION", LEFT_BOUNDARY + 60, 45);
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_LIGHT).text("Empowering Communities, Transforming Lives", LEFT_BOUNDARY + 60, 75);

    const contactX = RIGHT_BOUNDARY - RIGHT_COL_WIDTH;
    doc.font("OpenSans-Regular").fontSize(9).fillColor(TEXT_MAIN);
    doc.text("123 NGO Street, Social City", contactX, 45, { align: "right", width: RIGHT_COL_WIDTH });
    doc.text("India - 452001", contactX, 58, { align: "right", width: RIGHT_COL_WIDTH });
    doc.text("contact@orbosis.org", contactX, 71, { align: "right", width: RIGHT_COL_WIDTH });
    doc.text("+91 98765 43210", contactX, 84, { align: "right", width: RIGHT_COL_WIDTH });
    doc.moveTo(LEFT_BOUNDARY, 105).lineTo(RIGHT_BOUNDARY, 105).lineWidth(1).strokeColor(GOLD).stroke();

    let currentY = 135;
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    doc.font("OpenSans-Bold").fontSize(10).fillColor(TEXT_MAIN).text(`Ref No: OF/MEM/${member.memberId}`, LEFT_BOUNDARY, currentY);
    doc.text(`Date: ${today}`, RIGHT_BOUNDARY - RIGHT_COL_WIDTH, currentY, { width: RIGHT_COL_WIDTH, align: "right" });

    currentY += 40;
    const recipientName = name || member.fullName || "Member";
    doc.font("OpenSans-Bold").fontSize(11).text("To,", LEFT_BOUNDARY, currentY);
    currentY += 20;
    doc.font("Playfair-Bold").fontSize(14).fillColor(PRIMARY).text(recipientName, LEFT_BOUNDARY, currentY);
    currentY += 22;
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_MAIN).text((address || member.address || "Address not provided"), LEFT_BOUNDARY, currentY, { width: 250 });

    currentY += 60;
    doc.font("OpenSans-Bold").fontSize(12).fillColor(TEXT_MAIN).text("SUBJECT: APPOINTMENT LETTER", 0, currentY, { align: "center", underline: true });

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

    currentY = doc.y + 60;
    const sigY = currentY;
    doc.font("OpenSans-Bold").fontSize(10).text("Accepted By:", LEFT_BOUNDARY, sigY);
    doc.font("DancingScript").fontSize(18).text(recipientName, LEFT_BOUNDARY, sigY + 25);
    doc.font("OpenSans-Regular").fontSize(10).text(`(${recipientName})`, LEFT_BOUNDARY, sigY + 50);

    const rightSigX = RIGHT_BOUNDARY - RIGHT_COL_WIDTH;
    doc.font("OpenSans-Bold").fontSize(10).text("For Orbosis Foundation", rightSigX, sigY, { width: RIGHT_COL_WIDTH, align: "right" });
    doc.font("DancingScript").fontSize(20).text("Authorized Signatory", rightSigX, sigY + 25, { width: RIGHT_COL_WIDTH, align: "right" });
    doc.font("OpenSans-Regular").fontSize(10).text("Authorized Signatory", rightSigX, sigY + 50, { width: RIGHT_COL_WIDTH, align: "right" });

    const footerY = pageHeight - 50;
    doc.lineWidth(1).strokeColor(GOLD).moveTo(LEFT_BOUNDARY, footerY).lineTo(RIGHT_BOUNDARY, footerY).stroke();
    doc.font("OpenSans-Regular").fontSize(9).fillColor(TEXT_LIGHT).text("www.orbosisfoundation.org | Reg. No: 12345/2023", 0, footerY + 10, { align: "center" });

    doc.end();
    const pdfBuffer = await new Promise((resolve) => { doc.on("end", () => resolve(Buffer.concat(buffers))); });

    let cloudinaryUrl = await uploadBufferWithPublicId(pdfBuffer, `Appointment_Letter_${member.memberId}`, "member_docs/appointment_letters");
const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      {
        $set: {
          appointmentLetterIssued: true,
          appointmentLetterCloudinaryUrl: cloudinaryUrl,
          appointmentLetterPDF: pdfBuffer,
          appointmentLetterDate: new Date(),
        },
      },
      { new: true }
    );
return res.json({
      success: true,
      message: "Appointment Letter issued successfully",
      url: cloudinaryUrl,
      member: updatedMember,
    });
  } catch (err) { console.error("issueAppointmentLetter ERROR:", err); return res.status(500).json({ success: false, message: err.message }); }
};

export const downloadAppointmentLetter = async (req, res) => {
  try {
    const { id } = req.params;
    let member = (await Member.findById(id)) || (await Member.findOne({ memberId: id }));
    if (!member) return res.status(404).json({ success: false, message: "Appointment letter not found" });
    if (member.appointmentLetterCloudinaryUrl) return res.redirect(member.appointmentLetterCloudinaryUrl);
    if (member.appointmentLetterPDF) {
      res.setHeader("Content-Type", "application/pdf");
      const bufferData = member.appointmentLetterPDF.buffer || member.appointmentLetterPDF;
      return res.send(bufferData);
    }
    return res.status(404).json({ success: false, message: "Appointment letter not found" });
  } catch (err) { console.error("DOWNLOAD ERROR:", err); return res.status(500).json({ success: false, message: "Failed to download appointment letter" }); }
};

export const issueMembershipCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { issueDate } = req.body || {};
    let member = (await Member.findById(id)) || (await Member.findOne({ memberId: id }));
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    const doc = new PDFDocument({ layout: "landscape", size: "A4", margin: 0 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    const fontPath = path.join(process.cwd(), "assets", "fonts");
    doc.registerFont("GreatVibes", path.join(fontPath, "GreatVibes-Regular.ttf"));
    doc.registerFont("Playfair-Bold", path.join(fontPath, "playfair-display.bold.ttf"));
    doc.registerFont("OpenSans-Regular", path.join(fontPath, "open-sans.regular.ttf"));
    doc.registerFont("OpenSans-Bold", path.join(fontPath, "open-sans.bold.ttf"));
    doc.registerFont("DancingScript", path.join(fontPath, "dancing-script.regular.ttf"));

    const pageWidth = doc.page.width; const pageHeight = doc.page.height; const centerX = pageWidth / 2;
    const PRIMARY = "#4F46E5"; const GOLD = "#D4AF37"; const TEXT_MAIN = "#1F2937"; const TEXT_LIGHT = "#6B7280";

    doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");
    const margin = 20;
    doc.lineWidth(3).strokeColor(PRIMARY).rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2).stroke();
    doc.lineWidth(1).strokeColor(GOLD).rect(margin + 6, margin + 6, pageWidth - (margin * 2 + 12), pageHeight - (margin * 2 + 12)).stroke();

    doc.save();
    doc.fillColor(PRIMARY).opacity(0.1);
    doc.moveTo(0, 0).lineTo(150, 0).lineTo(0, 150).fill();
    doc.moveTo(pageWidth, pageHeight).lineTo(pageWidth - 150, pageHeight).lineTo(pageWidth, pageHeight - 150).fill();
    doc.restore();

    let currentY = 60;
    if (fs.existsSync(logoPath)) { const logoWidth = 80; doc.image(logoPath, centerX - logoWidth / 2, currentY, { width: logoWidth }); currentY += 90; } else { currentY += 50; }

    doc.font("OpenSans-Bold").fontSize(16).fillColor(PRIMARY).text("ORBOSIS FOUNDATION", 0, currentY, { align: "center", characterSpacing: 2 });
    currentY += 25;
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_LIGHT).text("Empowering Communities, Transforming Lives", 0, currentY, { align: "center", characterSpacing: 1 });
    currentY += 50;

    doc.font("GreatVibes").fontSize(50).fillColor(GOLD).text("Certificate of Membership", 0, currentY, { align: "center" });
    currentY += 65;

    doc.font("OpenSans-Regular").fontSize(12).fillColor(TEXT_MAIN).text("This is to certify that", 0, currentY, { align: "center" });
    currentY += 35;

    doc.font("Playfair-Bold").fontSize(32).fillColor(PRIMARY).text(member.fullName.toUpperCase(), 0, currentY, { align: "center" });
    const nameWidth = doc.widthOfString(member.fullName.toUpperCase());
    doc.lineWidth(1).strokeColor(GOLD).moveTo(centerX - nameWidth / 2 - 20, currentY + 40).lineTo(centerX + nameWidth / 2 + 20, currentY + 40).stroke();
    currentY += 55;

    doc.font("OpenSans-Regular").fontSize(12).fillColor(TEXT_MAIN).text("has been officially admitted as a registered member of the Orbosis Foundation.\nWe appreciate your dedication towards our cause.", 100, currentY, { align: "center", width: pageWidth - 200, lineGap: 5 });
    currentY += 60;

    let iDate = issueDate ? new Date(issueDate) : new Date();
    if (isNaN(iDate.getTime())) iDate = new Date();
    const dateStr = iDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const certCode = `CERT-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const detailsY = pageHeight - 130;

    doc.font("OpenSans-Bold").fontSize(10).fillColor(TEXT_MAIN).text("DATE ISSUED", 120, detailsY);
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_LIGHT).text(dateStr, 120, detailsY + 15);

    doc.font("OpenSans-Bold").fontSize(10).fillColor(TEXT_MAIN).text("CERTIFICATE ID", pageWidth - 220, detailsY);
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_LIGHT).text(certCode, pageWidth - 220, detailsY + 15);

    doc.font("OpenSans-Bold").fontSize(10).fillColor(TEXT_MAIN).text("MEMBER ID", centerX - 30, detailsY);
    doc.font("OpenSans-Regular").fontSize(10).fillColor(TEXT_LIGHT).text(member.memberId, centerX - 30, detailsY + 15);

    const sigY = pageHeight - 70;
    doc.lineWidth(1).strokeColor(TEXT_LIGHT).moveTo(120, sigY).lineTo(270, sigY).stroke();
    doc.font("OpenSans-Bold").fontSize(10).fillColor(TEXT_MAIN).text("AUTHORIZED SIGNATORY", 120, sigY + 10, { width: 150, align: "center" });

    doc.lineWidth(1).strokeColor(TEXT_LIGHT).moveTo(pageWidth - 270, sigY).lineTo(pageWidth - 120, sigY).stroke();
    doc.font("OpenSans-Bold").fontSize(10).fillColor(TEXT_MAIN).text("DIRECTOR", pageWidth - 270, sigY + 10, { width: 150, align: "center" });

    doc.font("DancingScript").fontSize(20).fillColor(TEXT_MAIN).opacity(0.8).text("Orbosis Admin", 140, sigY - 35);
    doc.font("DancingScript").fontSize(20).fillColor(TEXT_MAIN).opacity(0.8).text("Director Name", pageWidth - 250, sigY - 35);
    doc.opacity(1);

    doc.end();
    const pdfBuffer = await new Promise((resolve) => { doc.on("end", () => resolve(Buffer.concat(buffers))); });

    let cloudinaryUrl = await uploadBufferWithPublicId(pdfBuffer, `Membership_Certificate_${member.memberId}`, "member_docs/certificates");
    const updatedMember = await Member.findByIdAndUpdate(member._id, {
      $set: { membershipCertificateIssued: true, membershipCertificateCloudinaryUrl: cloudinaryUrl, membershipCertificatePDF: pdfBuffer, membershipCertificateDate: iDate },
    }, { new: true, strict: false }).lean();

    try {
      const user = await User.findOne({ email: member.email });
      const targetUserId = user ? user._id : member._id;
      const newNotification = await Notification.create({
        userType: "member", userId: targetUserId, type: "certificate", title: "Membership Certificate Issued", message: "Your official membership certificate has been issued.", redirectUrl: "/member-documents", read: false,
      });
      const io = req.app.get("io");
      if (io) io.to(`user-${targetUserId}`).emit("user-notification", newNotification);
    } catch (e) { console.error("Notification error", e); }

    return res.json({ success: true, message: "Membership Certificate issued successfully", member: updatedMember });
  } catch (err) { console.error("issueMembershipCertificate ERROR:", err); return res.status(500).json({ success: false, message: err.message }); }
};

export const downloadMembershipCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    let member = (await Member.findById(id)) || (await Member.findOne({ memberId: id }));
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    if (member.membershipCertificateCloudinaryUrl) return res.redirect(member.membershipCertificateCloudinaryUrl);
    if (member.membershipCertificatePDF) {
      res.setHeader("Content-Type", "application/pdf");
      const bufferData = member.membershipCertificatePDF.buffer || member.membershipCertificatePDF;
      return res.send(bufferData);
    }
    return res.status(404).json({ success: false, message: "Certificate not found" });
  } catch (err) { console.error("DOWNLOAD CERT ERROR:", err); return res.status(500).json({ success: false, message: "Download failed" }); }
};