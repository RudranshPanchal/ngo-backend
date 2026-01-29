
import express from "express";
import {getallFund,createFund,updateFund,deleteFund}  from "../../controller/fundRaising/fundRaising.js"
import { cloudinaryUpload } from "../../utils/multer.js";
const Fundrouter = express.Router();
Fundrouter.get("/", getallFund);

Fundrouter.post("/", cloudinaryUpload.single("image"), createFund);
Fundrouter.put("/:id", cloudinaryUpload.single("image"), updateFund);
Fundrouter.delete("/:id", deleteFund);

Fundrouter.get("/active", async (req, res) => {
  const data = await Fundraising.find({ status: "active" }).sort({ createdAt: -1 });
  res.json({ success: true, data });
});

export default Fundrouter;