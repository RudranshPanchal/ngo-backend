import express from "express";
import multer from "multer";
import {
  createCampaign,
  getPendingCampaigns,
  updateCampaignStatus,
  getApprovedCampaigns,
} from "../../controller/Campaign/campaign.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// USER → CREATE
router.post(
  "/apply",
  upload.fields([
    { name: "beneficiaryPhoto", maxCount: 1 },
    { name: "documents", maxCount: 1 },
  ]),
  createCampaign
);

// ADMIN
router.get("/pending", requireAuth, requireAdmin, getPendingCampaigns);
router.patch("/status/:id", requireAuth, requireAdmin, updateCampaignStatus);

// PUBLIC
router.get("/approved", getApprovedCampaigns);

export default router;
