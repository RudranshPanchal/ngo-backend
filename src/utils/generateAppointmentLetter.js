import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { uploadToCloudinary } from "./uploader.js";

export const generateAppointmentLetter = async (member, customData = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const safeId = member.memberId || member._id || "member";
      // Sanitize filename to remove special characters
      const fileName = `appointment_letter_${String(safeId).replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
      const tempDir = path.resolve("temp");

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fullPath = path.join(tempDir, fileName);
      const stream = fs.createWriteStream(fullPath);

      doc.pipe(stream);

      // ================= STYLING =================
      const primaryColor = "#4c1d95"; // Purple
      const secondaryColor = "#1f2937"; // Dark Gray
      const accentColor = "#6b7280"; // Light Gray

      // 1. Page Border
      doc.lineWidth(2).rect(20, 20, 555, 802).strokeColor(primaryColor).stroke();

      // 2. Header
      // Logo Placeholder (Circle with Initials)
      doc.save();
      doc.circle(80, 80, 30).fillColor(primaryColor).fill();
      doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("OF", 50, 72, { width: 60, align: "center" });
      doc.restore();

      // Organization Info (Right Aligned)
      doc.moveDown();
      doc.font("Helvetica-Bold").fontSize(20).fillColor(primaryColor)
         .text("ORBOSIS FOUNDATION", 140, 60, { align: "right" });
      
      doc.font("Helvetica").fontSize(9).fillColor(secondaryColor)
         .text("123 NGO Street, Social City", 140, 85, { align: "right" })
         .text("India - 452001", 140, 98, { align: "right" })
         .text("Email: contact@orbosis.org | Phone: +91 98765 43210", 140, 111, { align: "right" });

      // Separator Line
      doc.moveDown(2);
      doc.moveTo(50, 140).lineTo(545, 140).lineWidth(1).strokeColor(accentColor).stroke();
      doc.moveDown(2);

      // Date
      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.font("Helvetica-Bold").fontSize(10).fillColor(secondaryColor)
         .text(`Date: ${today}`, { align: "right" });
      doc.moveDown();

      // Recipient Details
      const recipientName = customData.name || member.fullName || "Member";
      const recipientAddress = customData.address || member.address || "Address not provided";

      doc.text("To,", 50, doc.y, { align: "left" });
      doc.font("Helvetica-Bold").fontSize(12).text(recipientName);
      doc.font("Helvetica").fontSize(10).text(recipientAddress, { width: 250 });
      doc.moveDown(3);

      // Subject
      doc.font("Helvetica-Bold").fontSize(14).fillColor(primaryColor)
         .text("SUBJECT: APPOINTMENT LETTER", { align: "center", underline: true });
      doc.moveDown(2);

      // Body
      doc.font("Helvetica").fontSize(11).fillColor(secondaryColor)
         .text(`Dear ${recipientName},`, { align: "left" });
      doc.moveDown();

      let startDateStr;
      if (customData.startDate) {
        startDateStr = new Date(customData.startDate).toLocaleDateString('en-GB');
      } else {
        startDateStr = member.approvedAt ? new Date(member.approvedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
      }
      const recipientRole = customData.role || "Member";

      doc.text(
        `We are pleased to inform you that you have been appointed as a ${recipientRole} of Orbosis Foundation, effective from ${startDateStr}. We were very impressed with your background and believe that your skills and experience will be a valuable asset to our organization.`,
        { align: "justify", lineGap: 5 }
      );
      doc.moveDown();
      
      doc.text(
        "As a member, you will play a vital role in our mission to empower communities and transform lives. We look forward to your active participation and contribution.",
        { align: "justify", lineGap: 5 }
      );
      doc.moveDown(2);

      // Key Details Box
      const startY = doc.y;
      const boxHeight = 90;
      
      // Draw Box background
      doc.save();
      doc.rect(50, startY, 495, boxHeight).fillColor("#f9fafb").fill();
      doc.rect(50, startY, 495, boxHeight).lineWidth(1).strokeColor("#e5e7eb").stroke();
      doc.restore();

      const textStartY = startY + 20;
      const labelX = 80;
      const valueX = 220;

      doc.fillColor(secondaryColor);
      
      doc.font("Helvetica").text("Role:", labelX, textStartY);
      doc.font("Helvetica-Bold").text(recipientRole, valueX, textStartY);

      doc.font("Helvetica").text("Start Date:", labelX, textStartY + 20);
      doc.font("Helvetica-Bold").text(startDateStr, valueX, textStartY + 20);

      doc.font("Helvetica").text("Member ID:", labelX, textStartY + 40);
      doc.font("Helvetica-Bold").text(member.memberId || "N/A", valueX, textStartY + 40);

      doc.y = startY + boxHeight + 25; // Move cursor below box
      
      doc.font("Helvetica").text(
        "We welcome you to the team and look forward to a successful journey together.",
        50, doc.y, { align: "justify" }
      );
      doc.moveDown(4);

      // Signatory
      doc.font("Helvetica-Bold").text("Sincerely,");
      doc.moveDown(3);
      
      // Signature Line
      doc.moveTo(50, doc.y).lineTo(200, doc.y).lineWidth(1).strokeColor(secondaryColor).stroke();
      doc.moveDown(0.5);
      
      doc.text("Authorized Signatory");
      doc.font("Helvetica").text("ORBOSIS FOUNDATION");

      // Footer
      const bottomY = 780;
      doc.moveTo(50, bottomY - 15).lineTo(545, bottomY - 15).lineWidth(1).strokeColor("#e5e7eb").stroke();
      
      doc.fontSize(8).font("Helvetica").fillColor(accentColor)
         .text("This is a computer-generated document and does not require a physical signature.", 50, bottomY, { align: "center" });
      
      doc.text("Orbosis Foundation | Reg. No: 12345/2023 | www.orbosis.org", 50, bottomY + 12, { align: "center" });

      doc.end();

      stream.on("finish", async () => {
        try {
          const fileBuffer = fs.readFileSync(fullPath);
          const fileObj = {
            path: fullPath,
            originalname: fileName,
            mimetype: "application/pdf",
            buffer: fileBuffer,
          };
          
          console.log("Uploading Appointment Letter to Cloudinary...", fileName);
          const result = await uploadToCloudinary(
            fileObj,
            "appointment-letters",
          );

          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

          // Handle various return types from uploader
          let uploadedUrl = null;
          if (typeof result === 'string') {
            uploadedUrl = result;
          } else if (result && result.secure_url) {
            uploadedUrl = result.secure_url;
          } else if (result && result.url) {
            uploadedUrl = result.url;
          }

          if (uploadedUrl) {
            resolve(uploadedUrl);
          } else {
            console.error("Cloudinary Upload Failed. Result:", result);
            reject(new Error("Cloudinary upload failed - No URL returned"));
          }
        } catch (uploadError) {
          console.error("Error in PDF upload process:", uploadError);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
          reject(uploadError);
        }
      });

      stream.on("error", (err) => {
        console.error("Stream Error:", err);
        reject(err);
      });
    } catch (err) {
      console.error("PDF Generation Error:", err);
      reject(err);
    }
  });
};
