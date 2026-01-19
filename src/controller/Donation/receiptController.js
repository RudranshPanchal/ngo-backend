import PDFDocument from "pdfkit";
import Donation from "../../model/Donation/donation.js"; // Sahi model use karein

export const generateReceipt = async (req, res) => {
  try {
    const donationId = req.params.id;
    const donation = await Donation.findById(donationId);

    if (!donation) return res.status(404).json({ message: "Donation not found" });

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    
    // PDF Header for Browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=80G_Receipt_${donation._id}.pdf`);

    doc.pipe(res);

    // Layout Logic (Aapka existing layout code yahan aayega)
    doc.fontSize(22).text("ORBOSIS FOUNDATION", { align: "center" }).moveDown();
    doc.fontSize(14).text("80G TAX EXEMPTION RECEIPT", { align: "center" }).moveDown(2);
    
    doc.fontSize(12).text(`Receipt No: ${donation.razorpayPaymentId || donation._id}`);
    doc.text(`Date: ${new Date(donation.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    doc.text(`Donor Name: ${donation.donorName}`);
    doc.text(`Email: ${donation.donorEmail}`);
    doc.text(`PAN Number: ${donation.panNumber || "N/A"}`); // Ensure PAN is in your model
    doc.moveDown();

    doc.fontSize(13).text(`Amount Received: ₹${donation.amount}`, { bold: true });
    doc.fontSize(10).text("Thank you for your generous contribution.", { align: 'center' }).moveDown();
    
    doc.end();
  } catch (error) {
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};