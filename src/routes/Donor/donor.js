
import express from "express";
import { optionalAuth, requireAuth, requireAdmin } from "../../middleware/auth.js";
import { upload } from "../../utils/multer.js";
import { generateReceipt } from "../../controller/Donation/receiptController.js";
import Donation from "../../model/Donation/donation.js"; // 🔥 ADD THIS

import {
  registerDonor,
  getDonorProfile,

  getDonorDashboard,
  getAllDonors,
  getPendingDonors,
  getSingleDonor,
  updateDonorProfile,
  // approveDonor,
  // rejectDonor,
    updateDonorStatus,
} from "../../controller/Donation/donorcontroller.js";

const donorRouter = express.Router();

/* ================= REGISTER DONOR ================= */
// donorRouter.post(
//   "/regesterDonor",
//   optionalAuth,
//   upload.single("uploadPaymentProof"),
//   registerDonor
// );

donorRouter.post(
  "/regesterDonor",
  optionalAuth,
  upload.single("uploadPaymentProof"),
  (req, res, next) => {
    console.log("🔥 DONOR REGISTER ROUTE HIT");
    next();
  },
  registerDonor
);

/* ================= RECEIPT ================= */
donorRouter.get(
  "/receipt/:id",
  requireAuth,
  generateReceipt
);

/* ================= DONOR PROFILE ================= */
donorRouter.get(
  "/profile",
  requireAuth,
  getDonorProfile
);


/* ================= DONOR DASHBOARD ================= */
donorRouter.get(
  "/dashboard",
  requireAuth,
  getDonorDashboard
);

/* ================= ADMIN : DONOR REQUESTS ================= */
donorRouter.get(
  "/admin/donors",
  requireAuth,
  requireAdmin,
  getAllDonors
);
donorRouter.get("/admin/donors/:id", requireAuth, requireAdmin, getSingleDonor);
// donorRouter.post(
//   "/admin/donors/:id/approve",
//   requireAuth,
//   requireAdmin,
//   approveDonor
// );

// donorRouter.post(
//   "/admin/donors/:id/reject",
//   requireAuth,
//   requireAdmin,
//   rejectDonor
// );
donorRouter.post(
  "/admin/donors/:id/status",
  requireAuth,
  requireAdmin,
  updateDonorStatus
);
donorRouter.get("/profile", requireAuth, getDonorProfile);
donorRouter.put("/update-profile", requireAuth, updateDonorProfile);
export default donorRouter;
