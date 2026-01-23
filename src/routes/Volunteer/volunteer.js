import express from "express";
import { registerVolunteer, getAllVolunteers, getVolunteerById, updateVolunteerStatus, getLeaderboard, getVolunteerStats, getVolunteerStatsById, getVolunteerTasksById } from "../../controller/Volunteer/volunteer.js";
import { upload } from "../../utils/multer.js";
import { requireAuth, requireVolunteer, requireAdmin, requireAdminOrVolunteer } from "../../middleware/auth.js";

const router = express.Router();

// Accept multipart/form-data with an optional file field named 'uploadIdProof'
router.post("/register", upload.single('uploadIdProof'), registerVolunteer);
router.get("/all", requireAuth, requireAdmin, getAllVolunteers,);
router.get("/leaderboard", getLeaderboard);
router.get("/stats", requireAuth, requireVolunteer, getVolunteerStats);
// admin routes
router.get("/:id/stats", requireAuth, requireAdmin, getVolunteerStatsById);
router.get("/:id/tasks/", requireAuth, requireAdmin, getVolunteerTasksById);
// router.post("/seed-stats", requireAuth, seedVolunteerStatsData); // 🛠️ New Debug Route
router.get("/:id", getVolunteerById);
router.put("/status/:id", requireAuth, requireAdminOrVolunteer, updateVolunteerStatus);



export default router;