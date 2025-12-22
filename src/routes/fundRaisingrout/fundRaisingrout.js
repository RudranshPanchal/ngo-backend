
import express from "express";
import {getallFund,createFund,updateFund,deleteFund}  from "../../controller/fundRaising/fundRaising.js"
import { upload } from "../../utils/multer.js";
// import fundraising from "../../model/fundraising/fundraising.js";

const Fundrouter = express.Router();
Fundrouter.get("/", getallFund);
// CREATE fund with image upload
Fundrouter.post("/", upload.single("image"), createFund);

// UPDATE fund with optional new image upload
Fundrouter.put("/:id", upload.single("image"), updateFund);
Fundrouter.delete("/:id", deleteFund);


// export default fundraising
export default Fundrouter;