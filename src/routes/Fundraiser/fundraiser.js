// import express from "express";
// import { applyForFundraiser, getAdminFundraisers, updateFundraiserStatus } from "../../controller/Fundraiser/fundraiser.js";
// import { upload } from "../../utils/multer.js";

// const router = express.Router();

// router.post(
//   "/apply",
//   upload.fields([
//     { name: "beneficiaryPhoto", maxCount: 1 },
//     { name: "documents", maxCount: 1 },
//   ]),
//   applyForFundraiser
// );

// // Admin Routes
// router.get("/admin/all", getAdminFundraisers);
// router.get("/admin/pending", (req, res, next) => { req.query.status = 'PENDING'; next(); }, getAdminFundraisers);
// router.patch("/admin/:id/status", updateFundraiserStatus);

// export default router;
import express from "express";
import {
  registerFundraiser,
  getFundraisers,
  updateFundraiserStatus,
} from "../../controller/Fundraiser/fundraiser.js";

import { requireAuth, requireAdmin } from "../../middleware/auth.js";

const router = express.Router();

// Fundraiser register (OTP verified)
router.post("/register", registerFundraiser);

// Admin only
router.get("/admin/all", requireAuth, requireAdmin, getFundraisers);
router.patch("/admin/:id/status", requireAuth, requireAdmin, updateFundraiserStatus);

export default router;
