import PDFDocument from "pdfkit";
import DonationReg from "../../model/donor_reg/donor_reg.js";

export const generateReceipt = async (req, res) => {
  try {
    const donationId = req.params.id;

    const donation = await DonationReg.findById(donationId).populate("userId");

    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Donation_Receipt_${donation._id}.pdf`
    );

    doc.pipe(res);

    /* ===== HEADER ===== */
    doc
      .fontSize(22)
      .text("ORBOSIS FOUNDATION", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(14)
      .text("Donation Receipt", { align: "center" })
      .moveDown(2);

    /* ===== RECEIPT INFO ===== */
    doc.fontSize(12);
    // doc.text(`Receipt ID: ${donation._id}`);
    doc.text(`Date: ${new Date(donation.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    /* ===== DONOR INFO ===== */
    doc.text(`Donor Name: ${donation.name}`);
    doc.text(`Email: ${donation.email}`);
    doc.text(`Contact: ${donation.contactNumber}`);
    doc.moveDown();

    /* ===== DONATION INFO ===== */
    doc.fontSize(13).text("Donation Details", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Amount: ₹${donation.donationAmount}`);
    doc.text(
      `Type: ${donation.fundraisingId ? "Fundraising Donation" : "General Donation"}`
    );
    doc.text("Payment Mode: UPI / Bank Transfer");
    doc.moveDown(2);

    /* ===== FOOTER ===== */
    doc
      .fontSize(10)
      .text(
        "This is a system generated receipt. No signature required.",
        { align: "center" }
      );

    doc.end();
  } catch (error) {
    console.error("❌ Receipt error:", error);
    res.status(500).json({ message: "Receipt generation failed" });
  }
};
