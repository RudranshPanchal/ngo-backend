// import express from "express";
// import { requireAuth } from "../../middleware/auth.js";
// import DonationReg from "../../model/donor_reg/donor_reg.js";
// import { upload } from "../../utils/multer.js";

// const donorRouter = express.Router();

// // REGISTER DONOR
// donorRouter.post(
//   "/regesterDonor",
//   upload.single("uploadPaymentProof"),
//   async (req, res) => {
//     try {
//       console.log("BODY:", req.body);
//       console.log("FILE:", req.file);

//       //SAFE FUND ID CHECK
//       const safeFundId =
//         req.body.fundraisingId && req.body.fundraisingId !== ""
//           ? req.body.fundraisingId
//           : null;

//       // SAVE DONOR
//       const newData = {
//         name: req.body.fullName,
//         organisationName: req.body.organisationName,
//         contactNumber: req.body.contactNumber,
//         address: req.body.address,
//         email: req.body.email,
//         panNumber: req.body.panNumber,
//         gstNumber: req.body.gstNumber,
//         donationAmount: req.body.donationAmount,
//         fundraisingId: safeFundId, 
//         uploadPaymentProof: req.file ? req.file.path : "",
//       };

//       const donorEntry = await DonationReg.create(newData);

//       //UPDATE FUNDRAISING PAYMENT
//       if (safeFundId) {
//         const Fund = await import("../../model/fundraising/fundraising.js").then(
//           (m) => m.default
//         );

//         const fundItem = await Fund.findById(safeFundId);

//         if (fundItem) {
//           const currentPayment = Number(fundItem.payment || 0);
//           const donationValue = Number(req.body.donationAmount || 0);

//           fundItem.payment = currentPayment + donationValue;
//           await fundItem.save();

//           console.log("✔ Progress Updated for:", safeFundId);
//         } else {
//           console.log("❌ Fundraising ID not found:", safeFundId);
//         }
//       } else {
//         console.log("General Donation → No fundraising update");
//       }

//       return res.json({
//         success: true,
//         message: safeFundId
//           ? "Fundraising donation recorded successfully"
//           : "General donation recorded successfully",
//         data: donorEntry,
//       });

//     } catch (error) {
//       console.error("Error:", error);
//       return res.status(500).json({
//         success: false,
//         message: "Something went wrong",
//         error: error.message,
//       });
//     }
//   }
// );

// //DONOR PROFILE ROUTES

// // donorRouter.get("/profile", (req, res) => {
// //   res.json({ message: "Donor profile endpoint" });
// // });

// // donorRouter.put("/profile", requireAuth, (req, res) => {
// //   res.json({ message: "Update donor profile endpoint" });
// // });

// // //DONATION HISTORY

// // donorRouter.get("/donations", requireAuth, (req, res) => {
// //   res.json({ message: "Donor donations endpoint" });
// // });

// // //DONOR DASHBOARD

// // donorRouter.get("/dashboard", (req, res) => {
// //   res.json({ message: "Donor dashboard endpoint" });
// // });

// export default donorRouter;
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

/* ===============================
   DONOR REGISTRATION
   =============================== */
// goes to DonationReg collection
router.post(
  "/regesterDonor",
  optionalAuth,
  upload.single("uploadPaymentProof"),
  registerDonor
);

/* ===============================
   DONATION / PAYMENT
   =============================== */
// cash / cheque / razorpay order
// router.post(
//   "/create-order",
//   requireAuth,
//   createDonationOrder
// );
router.post("/create-order", optionalAuth, createDonationOrder);
router.put("/update-profile", requireAuth, updateDonorProfile);
// razorpay payment verification
router.post(
  "/verify-payment",
  verifyDonationPayment
);

/* ===============================
   DONOR DATA (AFTER LOGIN)
   =============================== */
// donation history
router.get(
  "/history",
  requireAuth,
  getUserDonations
);

// donor dashboard stats
router.get(
  "/stats",
  requireAuth,
  getDonorStats
);

// recent donations
router.get(
  "/recent",
  requireAuth,
  getRecentDonations
);
router.get(
  "/admin/donations",
  requireAuth,
  getAllDonationsForAdmin
);
router.get(
  "/admin/active-donors",
  requireAuth,
  getActiveDonorsFromUserCollection
);
router.get(
  "/admin/donors/:id",
  requireAuth,
  getDonorById
);
// routes/Donor/donor.js
// Is route ko apne routes file mein check karo ya add karo

router.get("/receipt/:id", requireAuth, async (req, res) => {
    try {
        // Yahan 'Donation' use ho raha hai, isliye upar import hona zaroori hai
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ message: "Donation not found" });
        }

        // Security Check: Ensure user owns this donation
        if (donation.userId && req.user && donation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this receipt." });
        }

        // --- SELF-HEALING: If receiptUrl is missing, regenerate it ---
        if (!donation.receiptUrl) {
            console.log("⚠️ Receipt URL missing in DB. Attempting to regenerate...");
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
                const receiptUrl = await uploadToCloudinary(pdfBuffer, "receipts");

                if (receiptUrl) {
                    donation.receiptUrl = receiptUrl;
                    await donation.save();
                    console.log("✅ Receipt Regenerated & Saved:", receiptUrl);
                } else {
                    throw new Error("Cloudinary upload failed during regeneration");
                }
            } catch (regenError) {
                console.error("❌ Receipt Regeneration Failed:", regenError.message);
                return res.status(404).json({ message: "Receipt not found and could not be generated." });
            }
        }

        // Check if URL is from Cloudinary (starts with http)
        if (donation.receiptUrl.startsWith("http")) {
            const secureUrl = donation.receiptUrl.replace("http://", "https://");
            
            // Helper function to follow redirects (Cloudinary often redirects)
            const fetchUrl = (url) => {
                https.get(url, (stream) => {
                    // Handle Redirects (301, 302)
                    if (stream.statusCode >= 300 && stream.statusCode < 400 && stream.headers.location) {
                        return fetchUrl(stream.headers.location);
                    }

                    if (stream.statusCode !== 200) {
                        console.error(`Cloudinary Fetch Failed: ${stream.statusCode} for URL: ${url}`);
                        stream.resume(); 
                        return res.status(404).json({ message: "Receipt file not found on cloud" });
                    }
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename=Receipt-${donation._id}.pdf`);
                    stream.pipe(res);
                }).on('error', (err) => {
                    console.error("Cloudinary Stream Error:", err);
                    res.status(500).json({ message: "Failed to fetch receipt" });
                });
            };

            return fetchUrl(secureUrl);
        }

        // process.cwd() se absolute path banta hai
        const filePath = path.join(process.cwd(), donation.receiptUrl);

        console.log("📂 Attempting to send file from:", filePath);

        if (fs.existsSync(filePath)) {
            // res.download file ko force download karwayega
            return res.download(filePath, `Receipt-${donation._id}.pdf`);
        } else {
            console.error("❌ Physical file missing on server at:", filePath);
            return res.status(404).json({ message: "File missing on server" });
        }
    } catch (err) {
        console.error("❌ Route Error:", err.message); // Yahan 'Donation is not defined' aa raha tha
        res.status(500).json({ error: err.message });
    }
});
// router.get(
//   "/history",
//   requireAuth,      // ❌ bina login → access nahi
//   getUserDonations
// );

export default router;
