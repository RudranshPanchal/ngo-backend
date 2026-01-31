import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import QRCode from "qrcode"; 
import { uploadToCloudinary } from "./uploader.js";

const logoPath = path.join(process.cwd(), "signatures", "orbosis.png");

export async function generateIdCard(member) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [325, 204],
        margin: 0,
      });

      const fileName = `ID_${member.memberId}.pdf`;
      const outputPath = path.join(process.cwd(), "uploads/id-cards", fileName);

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      /* ================= BACKGROUND ================= */
      doc.rect(0, 0, 325, 204).fill("#f9fafb");

      /* ================= HEADER ================= */
      doc.rect(0, 0, 325, 42).fill("#7c3aed");

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 10, 6, { width: 30 });
      }

      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Orbosis Foundation", 0, 14, { align: "center" });

      /* ================= PHOTO BOX ================= */
      doc.roundedRect(18, 58, 70, 86, 6).lineWidth(1).stroke("#c7c7c7");

      doc.fontSize(8).fillColor("#6b7280").text("PHOTO", 18, 98, {
        width: 70,
        align: "center",
      });

      // 🔮 FUTURE PHOTO (Cloudinary ready)
      /*
      if (member.profilePhoto) {
        doc.image(member.profilePhoto, 18, 58, {
          width: 70,
          height: 86,
          fit: [70, 86],
        });
      }
      */

      /* ================= TEXT DETAILS ================= */
      const leftX = 105;

      doc
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(member.fullName, leftX, 60);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#374151")
        .text(`Member ID: ${member.memberId}`, leftX, 80);

      doc.text(
        `Issued: ${new Date(member.idCardIssueDate).toLocaleDateString()}`,
        leftX,
        96,
      );

      /* ================= QR CODE ================= */
      const qrPayload = JSON.stringify({
        memberId: member.memberId,
        name: member.fullName,
      });

      const qrImage = await QRCode.toDataURL(qrPayload);

      doc.image(qrImage, 235, 86, { width: 70 });

      doc.fontSize(7).fillColor("#6b7280").text("Scan to verify", 235, 160, {
        width: 70,
        align: "center",
      });

      doc.end();

      stream.on("finish", async () => {
        try {
          const fileObj = {
            path: outputPath,
            originalname: fileName,
            mimetype: "application/pdf",
          };

          console.log("Uploading ID Card to Cloudinary...");
          const url = await uploadToCloudinary(fileObj, "id-cards");

          // Optional: Delete local file
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

          resolve(url);
        } catch (error) {
          console.error("ID Card Upload Error:", error);
          reject(error);
        }
      });

      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
