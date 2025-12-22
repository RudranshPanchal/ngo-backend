import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import DonationReg from "../../model/donor_reg/donor_reg.js";
import { upload } from "../../utils/multer.js";

const donorRouter = express.Router();

// REGISTER DONOR
donorRouter.post(
  "/regesterDonor",
  upload.single("uploadPaymentProof"),
  async (req, res) => {
    try {
      console.log("BODY:", req.body);
      console.log("FILE:", req.file);

      //SAFE FUND ID CHECK
      const safeFundId =
        req.body.fundraisingId && req.body.fundraisingId !== ""
          ? req.body.fundraisingId
          : null;

      // SAVE DONOR
      const newData = {
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
      };

      const donorEntry = await DonationReg.create(newData);

      //UPDATE FUNDRAISING PAYMENT
      if (safeFundId) {
        const Fund = await import("../../model/fundraising/fundraising.js").then(
          (m) => m.default
        );

        const fundItem = await Fund.findById(safeFundId);

        if (fundItem) {
          const currentPayment = Number(fundItem.payment || 0);
          const donationValue = Number(req.body.donationAmount || 0);

          fundItem.payment = currentPayment + donationValue;
          await fundItem.save();

          console.log("✔ Progress Updated for:", safeFundId);
        } else {
          console.log("❌ Fundraising ID not found:", safeFundId);
        }
      } else {
        console.log("General Donation → No fundraising update");
      }

      return res.json({
        success: true,
        message: safeFundId
          ? "Fundraising donation recorded successfully"
          : "General donation recorded successfully",
        data: donorEntry,
      });

    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: error.message,
      });
    }
  }
);

//DONOR PROFILE ROUTES

donorRouter.get("/profile", (req, res) => {
  res.json({ message: "Donor profile endpoint" });
});

donorRouter.put("/profile", requireAuth, (req, res) => {
  res.json({ message: "Update donor profile endpoint" });
});

//DONATION HISTORY

donorRouter.get("/donations", requireAuth, (req, res) => {
  res.json({ message: "Donor donations endpoint" });
});

//DONOR DASHBOARD

donorRouter.get("/dashboard", (req, res) => {
  res.json({ message: "Donor dashboard endpoint" });
});

export default donorRouter;
