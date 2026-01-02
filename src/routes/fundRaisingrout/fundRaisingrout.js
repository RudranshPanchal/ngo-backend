
import express from "express";
import {getallFund,createFund,updateFund,deleteFund}  from "../../controller/fundRaising/fundRaising.js"
// import { upload } from "../../utils/multer.js";
// import fundraising from "../../model/fundraising/fundraising.js";
import { cloudinaryUpload } from "../../utils/multer.js";
const Fundrouter = express.Router();
Fundrouter.get("/", getallFund);
// CREATE fund with image upload
Fundrouter.post("/", cloudinaryUpload.single("image"), createFund);
Fundrouter.put("/:id", cloudinaryUpload.single("image"), updateFund);
Fundrouter.delete("/:id", deleteFund);


// export default fundraising
export default Fundrouter;