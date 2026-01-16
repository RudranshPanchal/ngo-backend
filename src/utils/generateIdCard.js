// import PDFDocument from "pdfkit";
// import fs from "fs";
// import path from "path";

// export async function generateIdCard(member) {
//   const doc = new PDFDocument({ size: "A6" });

//   const fileName = `ID_${member._id}.pdf`;
//   const outputPath = path.join(
//     process.cwd(),
//     "uploads/id-cards",
//     fileName
//   );

//   doc.pipe(fs.createWriteStream(outputPath));

//   // Background
//   doc.rect(0, 0, 298, 420).fill("#4c1d95");

//   // ================= PHOTO (FUTURE READY) =================
//   /*
//   if (member.photo) {
//     // 🔮 FUTURE (Cloudinary URL)
//     const response = await fetch(member.photo);
//     const buffer = await response.arrayBuffer();
//     doc.image(Buffer.from(buffer), 80, 50, { width: 120, height: 120 });
//   }
//   */

//   // TEMP PLACEHOLDER
//   doc
//     .fillColor("white")
//     .fontSize(12)
//     .text("PHOTO", 0, 90, {
//       align: "center"
//     });

//   // Name
//   doc
//     .fillColor("white")
//     .fontSize(16)
//     .text(member.fullName, 0, 200, {
//       align: "center"
//     });

//   // Member ID
//   doc
//     .fontSize(12)
//     .text(`Member ID: ${member.memberId}`, {
//       align: "center"
//     });

//   doc.end();

//   return `/uploads/id-cards/${fileName}`;
// }


import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

export async function generateIdCard(member) {
  const doc = new PDFDocument({
    size: [325, 204],
    margin: 0,
  });

  const fileName = `ID_${member.memberId}.pdf`;
  const outputPath = path.join(process.cwd(), "uploads/id-cards", fileName);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  doc.pipe(fs.createWriteStream(outputPath));

  /* ================= BACKGROUND ================= */
  doc.rect(0, 0, 325, 204).fill("#f9fafb");

  /* ================= HEADER ================= */
  doc.rect(0, 0, 325, 42).fill("#7c3aed");
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Orbosis Foundation", 0, 14, { align: "center" });

  /* ================= PHOTO BOX ================= */
  doc
    .roundedRect(18, 58, 70, 86, 6)
    .lineWidth(1)
    .stroke("#c7c7c7");

  doc
    .fontSize(8)
    .fillColor("#6b7280")
    .text("PHOTO", 18, 98, {
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

  doc
    .text(
      `Issued: ${new Date(member.idCardIssueDate).toLocaleDateString()}`,
      leftX,
      96
    );

  /* ================= QR CODE ================= */
  const qrPayload = JSON.stringify({
    memberId: member.memberId,
    name: member.fullName,
  });

  const qrImage = await QRCode.toDataURL(qrPayload);

  doc.image(qrImage, 235, 86, { width: 70 });

  doc
    .fontSize(7)
    .fillColor("#6b7280")
    .text("Scan to verify", 235, 160, {
      width: 70,
      align: "center",
    });

  doc.end();
  return `/uploads/id-cards/${fileName}`;
}
