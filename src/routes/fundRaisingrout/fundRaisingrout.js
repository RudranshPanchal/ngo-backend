import { requireAuth, verifyToken } from "../../middleware/auth.js";
import express from "express";
import {getallFund,createFund,updateFund,deleteFund,getMyCampaigns}  from "../../controller/fundRaising/fundRaising.js"
import { cloudinaryUpload } from "../../utils/multer.js";
const Fundrouter = express.Router();
Fundrouter.get("/", getallFund);

Fundrouter.post("/", requireAuth, cloudinaryUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'beneficiaryPhoto', maxCount: 1 },
  { name: 'documents', maxCount: 1 }
]), createFund);
Fundrouter.put("/:id", cloudinaryUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'beneficiaryPhoto', maxCount: 1 },
  { name: 'documents', maxCount: 1 }
]), updateFund);
Fundrouter.delete("/:id", deleteFund);
Fundrouter.get("/my-campaigns", requireAuth, getMyCampaigns);
Fundrouter.get("/active", async (req, res) => {
  const data = await Fundraising.find({ status: "active" }).sort({ createdAt: -1 });
  res.json({ success: true, data });
});

export default Fundrouter;