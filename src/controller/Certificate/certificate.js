import Certificate from "../../model/Certificate/certificate.js";
import PDFDocument from "pdfkit";
import { sendCertificateEmail } from "../../utils/mail.js";

 
//      DONOR TEMPLATE
function drawDonationCertificate(doc, cert) {
  const { recipientName, issueDate } = cert;

  const formattedName =
    recipientName.charAt(0).toUpperCase() + recipientName.slice(1).toLowerCase();

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height)
    .fillColor("#FFFFFF")
    .fill();

  // Border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .lineWidth(2)
    .strokeColor("#2A5C2A")
    .stroke();

  const centerX = doc.page.width / 2;

  //  ORBOSIS LOGO (TOP-CENTER)
  try {
  const logoWidth = 160;   //  Increase image size
  const logoHeight = 160;  //  You can adjust height too

  // Draw Logo at top center
  doc.image("./uploads/orbosis-logo.png", centerX - (logoWidth / 2), 40, {
    width: logoWidth,
    height: logoHeight
  });

  doc.y = 40 + logoHeight + 20; 

} catch (err) {
  console.log("Logo load error:", err);
}


  // TITLE
  doc.font("Helvetica-Bold")
    .fontSize(32)
    .fillColor("#255A29")
    .text("CERTIFICATE OF DONATION", {
      align: "center"
    });

  doc.moveDown(1);

  // Subtitle
  doc.font("Helvetica")
    .fontSize(14)
    .fillColor("#444")
    .text("THIS CERTIFICATE IS AWARDED TO", {
      align: "center"
    });

  doc.moveDown(0.8);

  //  CENTERED BENEFICIARY NAME
  doc.font("Helvetica-Bold")
    .fontSize(36)
    .fillColor("#255A29")
    .text(formattedName, {
      align: "center"
    });

  doc.moveDown(1.2);

  // DESCRIPTION (CENTERED)
  doc.font("Helvetica")
    .fontSize(13)
    .fillColor("#444")
    .text(
      
      "WITH DEEPEST GRATITUDE AND HEARTFELT APPRECIATION FOR YOUR KINDNESS, COMPASSION, AND UNWAVERING SUPPORT TO THE GREEN FUTURE INITIATIVE. YOUR COMMITMENT TO SUSTAINABILITY AND POSITIVE CHANGE CONTINUES TO INSPIRE HOPE AND CREATE A BRIGHTER, GREENER TOMORROW FOR GENERATIONS TO COME",
      {
        align: "center",
        width: doc.page.width - 120
      }
    );

  doc.moveDown(4);

  // SIGNATURE SECTION
  const sigY = doc.y + 20;

  doc.moveTo(80, sigY).lineTo(260, sigY).strokeColor("#444").stroke();

  doc.fontSize(12).font("Helvetica")
    .text("Miss. Pooja Mogal", 100, sigY + 8);

  doc.fontSize(10)
    .text("Authorized Signatory", 108, sigY + 24);

  // MOVE ISSUE DATE HERE INSTEAD OF GREEN FUTURE
  doc.fontSize(10)
  .fillColor("#255A29")
  .text(`CERTIFICATION DATE: ${issueDate}`, 40, sigY + 15, {
    align: "right",
    width: doc.page.width - 80
  });

  return doc;
}

//      VOLUNTEER TEMPLATE
function drawVolunteerTemplate(doc, { recipientName, issueDate }) {

  const pageWidth = doc.page.width;
  const centerX = pageWidth / 2;

  const formattedName =
    recipientName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  doc.rect(20, 20, pageWidth - 40, doc.page.height - 40)
    .lineWidth(6)
    .strokeColor("#D97A4A")
    .stroke();

  try {
    const logoWidth = 160;
    const logoHeight = 160;

    doc.image(
      "./uploads/orbosis-logo.png",
      centerX - logoWidth / 2,
      40,
      { width: logoWidth, height: logoHeight }
    );

    doc.y = 40 + logoHeight + 10;

  } catch {
    console.log("Logo not found");
  }

  doc.font("Helvetica-Bold")
    .fontSize(26)
    .fillColor("#3F6FD9")
    .text("Health NGO", { align: "center" });

  doc.fontSize(30)
    .text("Volunteer Certificate", { align: "center" });

  doc.moveDown(0.4);

  doc.font("Helvetica")
    .fontSize(14)
    .fillColor("#666")
    .text("Certificate of Service", { align: "center" });

  doc.moveDown(1.5);

  doc.fontSize(14)
    .fillColor("#444")
    .text("Presented to", { align: "center" });

  doc.moveDown(0.4);

  doc.font("Helvetica-Bold")
    .fontSize(32)
    .fillColor("#D97A4A")
    .text(formattedName, { align: "center" });

  doc.moveDown(0.3);
  doc.lineWidth(1)
     .moveTo(centerX - 130, doc.y)
     .lineTo(centerX + 130, doc.y)
     .strokeColor("#3F6FD9")
     .stroke();

  doc.moveDown(1);

  doc.font("Helvetica")
    .fontSize(14)
    .fillColor("#555")
    .text(
      "As a volunteer for our Health NGO.\nYour dedication to improving health care is appreciated.",
      { align: "center", width: pageWidth - 120 }
    );

  doc.moveDown(2);

  const footerY = doc.y;

  // ---- DATE ----
  doc.fontSize(12)
    .fillColor("#444")
    .text(issueDate, 100, footerY);

  doc.lineWidth(0.5)
     .moveTo(100, footerY + 14)
     .lineTo(180, footerY + 14)
     .stroke();

  doc.fontSize(10)
    .text("Date", 120, footerY + 18);

  // ---- SIGNATURE ----
  const signX = pageWidth - 240;

  doc.fontSize(12)
    .text("Pooja Mogal", signX, footerY);

  doc.lineWidth(0.5)
     .moveTo(signX, footerY + 14)
     .lineTo(signX + 140, footerY + 14)
     .stroke();

  doc.fontSize(10)
    .text("Authorized Signatory", signX + 15, footerY + 18);
}


//      1. CREATE CERTIFICATE (NO PDF HERE!)
export const generateCertificate = async (req, res) => {
  try {
    const { recipientName, issueDate, description, email, role } = req.body;

    // Validation
    if (!recipientName || !issueDate || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields including role are required",
      });
    }

    // Save to DB
    const certificate = new Certificate({
      recipientName,
      email,
      issueDate,
      description,
      role,
      status: "Pending",
    });

    await certificate.save();

    // Return response ONLY JSON (PDF generate नहीं करना यहां)
    return res.json({
      success: true,
      message: "Certificate created successfully",
      certificate,
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

//      2. DOWNLOAD PDF BY ID (role-based)
export const downloadCertificatePDF = async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    const doc = new PDFDocument({ size: "A4", margins: 50 });
    let buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdf = Buffer.concat(buffers);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${cert.recipientName}.pdf`);
      res.send(pdf);
    });

    // 👉 FIXED: Correct function call
    if (cert.role === "donor") {
      drawDonationCertificate(doc, cert);
    } else {
      drawVolunteerTemplate(doc, cert);
    }

    doc.end();

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

//      3. DELETE CERTIFICATE
export const deleteCertificate = async (req, res) => {
  try {
    const deleted = await Certificate.findByIdAndDelete(req.params.id);
    if (!deleted) {
    return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    return res.json({ success: true, message: "Certificate deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

//      4. GET ALL CERTIFICATES
export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });
    return res.json({ success: true, certificates });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

//      5. VERIFY CERTIFICATE
export const verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate)
      return res.status(404).json({ success: false, message: "Certificate not found" });

    return res.json({ success: true, certificate });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

//      6. UPDATE STATUS
export const updateCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndUpdate(
      req.params.id,
      { status: "Issued" },
      { new: true }
    );

    if (!cert) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Status updated",
      certificate: cert,
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//      7. SEND PDF TO EMAIL (role-based)
export const sendCertificateEmailController = async (req, res) => {
  try {
    const { email, recipientName, issueDate, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: "Email + role required" });
    }

    const doc = new PDFDocument({ size: "A4", margins: 50 });
    let buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      await sendCertificateEmail({
        toEmail: email,
        recipientName,
        pdfBuffer,
      });

      return res.json({ success: true, message: "Certificate sent to email!" });
    });

    // 👉 FIXED: cert.role was wrong. Use role from request
    if (String(role).toLowerCase() === "donor") {
      drawDonationCertificate(doc, { recipientName,  issueDate });
    } else {
      drawVolunteerTemplate(doc, { recipientName,  issueDate });
    }

    doc.end();

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
