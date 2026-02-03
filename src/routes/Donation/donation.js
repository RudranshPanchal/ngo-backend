import express from "express";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { upload } from "../../utils/multer.js";
import { generateReceipt } from "../../controller/Donation/receiptController.js";
import path from "path";
import fs from "fs";
import {
  registerDonor,
  createDonationOrder,
  verifyDonationPayment,
  getUserDonations,
  getDonorStats,
  getRecentDonations,
  getAllDonationsForAdmin,
  updateDonorProfile,
  getActiveDonorsFromUserCollection,
  getDonorById
} from "../../controller/Donation/donation.js";
import Donation from "../../model/Donation/donation.js";
import https from "https";
import { generatePDFBuffer } from "../../services/pdf.service.js";
import { NGO_80G } from "../../config/ngo.config.js";
import { numberToWords } from "../../utils/numberToWords.js";
import cloudinary from "../../config/cloudinary.js";
import { uploadToCloudinary } from "../../utils/uploader.js";
const router = express.Router();

// goes to DonationReg collection
router.post("/regesterDonor",optionalAuth,upload.single("uploadPaymentProof"),registerDonor);
router.post("/create-order", optionalAuth, createDonationOrder);
router.put("/update-profile", requireAuth, updateDonorProfile);
// razorpay payment verification
router.post("/verify-payment",verifyDonationPayment);

// donation history
router.get("/history",requireAuth,getUserDonations);

// donor dashboard stats
router.get("/stats",requireAuth,getDonorStats);
// recent donations
router.get("/recent",requireAuth,getRecentDonations);
router.get("/admin/donations",requireAuth,getAllDonationsForAdmin);
router.get("/admin/active-donors",requireAuth,getActiveDonorsFromUserCollection);
router.get("/admin/donors/:id",requireAuth,getDonorById);
// routes/Donor/donor.js
router.get("/receipt/:id", requireAuth, async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ message: "Donation not found" });
        }

        // Security Check: Ensure user owns this donation OR is admin
        if (req.user.role !== 'admin' && donation.userId && req.user && donation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this receipt." });
        }

        let receiptUrl = donation.receiptUrl;
        let needsRegeneration = !receiptUrl;

        // Check if local file exists (if not a cloud URL)
        if (receiptUrl && !receiptUrl.startsWith("http")) {
             const filePath = path.join(process.cwd(), receiptUrl);
             if (!fs.existsSync(filePath)) {
                 console.log(" Local receipt file missing on server, triggering regeneration.");
                 needsRegeneration = true;
             }
        }

        // --- SELF-HEALING: If receiptUrl is missing or file missing, regenerate it ---
        if (needsRegeneration) {
            console.log("🔄 Receipt URL missing or file invalid. Attempting to regenerate...");
            try {
                const receiptData = {
                    ngoName: NGO_80G.name,
                    ngoAddress: NGO_80G.address,
                    ngoPan: NGO_80G.pan,
                    ngoLogo: NGO_80G.ngoLogo || NGO_80G.logo,
                    registration80G: NGO_80G.registration80G,
                    validity: NGO_80G.validity,
                    donorName: donation.donorName,
                    donorEmail: donation.donorEmail,
                    donorPan: donation.panNumber || "N/A",
                    donorAddress: donation.address || "N/A",
                    donationPurpose: donation.purposeOfDonation || "N/A",
                    amount: donation.amount,
                    amountInWords: numberToWords(donation.amount),
                    modeOfPayment: donation.modeofDonation,
                    transactionId: donation.razorpayPaymentId || donation._id,
                    receiptNo: donation.receiptNo || `REC-${donation._id}`,
                    date: new Date(donation.createdAt).toLocaleDateString("en-IN"),
                    declaration: "This donation is eligible for deduction under Section 80G of the Income Tax Act, 1961.",
                    signature: NGO_80G.signatureImage
                };

                const pdfBuffer = await generatePDFBuffer(receiptData, "donation");
                const newUrl = await uploadToCloudinary(pdfBuffer, "receipts");

                if (newUrl) {
                    donation.receiptUrl = newUrl;
                    await donation.save();
                    receiptUrl = newUrl;
                    console.log(" Receipt Regenerated & Saved:", newUrl);
                } else {
                    throw new Error("Cloudinary upload failed during regeneration");
                }
            } catch (err) {
                console.error(" Receipt Regeneration Failed:", err.message);
                return res.status(500).json({ message: "Receipt generation failed" });
            }
        }

        // Check if URL is from Cloudinary 
        if (receiptUrl && receiptUrl.startsWith("http")) {
            const secureUrl = receiptUrl.replace("http://", "https://");
            return res.redirect(secureUrl);
        }

        const filePath = path.join(process.cwd(), receiptUrl);

        console.log("📂 Attempting to send file from:", filePath);

        if (fs.existsSync(filePath)) {
            return res.download(filePath, `Receipt-${donation._id}.pdf`);
        } else {
            console.error(" Physical file missing on server at:", filePath);
            return res.status(404).json({ message: "File missing on server" });
        }
    } catch (err) {
        console.error(" Route Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});
export default router;
