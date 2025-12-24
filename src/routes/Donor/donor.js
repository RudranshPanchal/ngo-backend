import express from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import DonationReg from "../../model/donor_reg/donor_reg.js";
import Donation from "../../model/Donation/donation.js"; // 🔥 ADD THIS
import { upload } from "../../utils/multer.js";
import { generateReceipt } from "../../controller/Donation/receiptController.js";



const donorRouter = express.Router();

//REGISTER DONOR
donorRouter.post(
  "/regesterDonor",
   optionalAuth, 
  upload.single("uploadPaymentProof"),
  async (req, res) => {
    try {
      const safeFundId =
        req.body.fundraisingId && req.body.fundraisingId !== ""
          ? req.body.fundraisingId
          : null;

      const donorEntry = await DonationReg.create({
        userId: req.user?._id || null,
        name: req.body.fullName,
        organisationName: req.body.organisationName,
        contactNumber: req.body.contactNumber,
        address: req.body.address,
        email: req.body.email,
        panNumber: req.body.panNumber,
        gstNumber: req.body.gstNumber,
        donationAmount: req.body.donationAmount,
        fundraisingId: safeFundId,
        uploadPaymentProof: req.file ? req.file.path : "",
      });

      if (safeFundId) {
        const Fund = await import("../../model/fundraising/fundraising.js").then(
          (m) => m.default
        );

        const fundItem = await Fund.findById(safeFundId);
        if (fundItem) {
          fundItem.payment =
            Number(fundItem.payment || 0) +
            Number(req.body.donationAmount || 0);
          await fundItem.save();
        }
      }

      return res.json({
        success: true,
        message: "Donor registered successfully",
        data: donorEntry,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to register donor",
        error: error.message,
      });
    }
  }
);
donorRouter.get(
  "/receipt/:id",
  requireAuth,
  generateReceipt
);
// DONOR PROFILE
donorRouter.get("/profile", requireAuth, async (req, res) => {
  try {
    const profile = await DonationReg.findOne({
      userId: req.user._id,
    });

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch donor profile",
    });
  }
});

//DONATION HISTORY (IMPORTANT)
donorRouter.get("/history", requireAuth, async (req, res) => {
  try {
    const donors = await DonationReg.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      donations: donors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DONOR DASHBOARD 
donorRouter.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const totalAmount = await Donation.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return res.json({
      success: true,
      totalDonation: totalAmount[0]?.total || 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
});

export default donorRouter;

