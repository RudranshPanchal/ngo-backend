import express from "express";
import { registerVolunteer, getAllVolunteers, getVolunteerById, updateVolunteerStatus } from "../../controller/Volunteer/volunteer.js";
import { upload } from "../../utils/multer.js";

const router = express.Router();

// Accept multipart/form-data with an optional file field named 'uploadIdProof'
router.post("/register", upload.single('uploadIdProof'), registerVolunteer);
router.get("/all", getAllVolunteers);
router.get("/:id", getVolunteerById);
router.put("/status/:id", updateVolunteerStatus);

export default router;