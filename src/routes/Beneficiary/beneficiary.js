import express from "express";
import { 
    registerBeneficiary, 
    getAllBeneficiaries, 
    updateBeneficiaryStatus,
    deleteBeneficiary 
} from "../../controller/Beneficiary/beneficiary.js";

const router = express.Router();

router.post("/register", registerBeneficiary);
router.get("/all", getAllBeneficiaries);
router.put("/status/:id", updateBeneficiaryStatus);
router.delete("/delete/:id", deleteBeneficiary);

export default router;
