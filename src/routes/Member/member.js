import express from "express";
import {  getMemberById,registerMember, approveMember, getAllMembers, updateMemberStatus } from "../../controller/Member/member.js";
import { requireAuth, requireAdmin, requireAdminOrVolunteer } from "../../middleware/auth.js";

const router = express.Router();

// Public member registration endpoint (used by admin UI in this project)
// router.post("/register", registerMember);
// // member/register

// // To approve members
// router.post("/approve", approveMember);
// router.get("/all", getAllMembers);
// router.put("/status/:id", updateMemberStatus);

// // Get all members (protected if you want — currently public in original)
// router.get("/all", requireAuth, getAllMembers);
// router.get("/:id", requireAuth, getMemberById);

// // Update member status (admin/volunteer)
// router.put("/status/:id", requireAuth, requireAdminOrVolunteer, updateMemberStatus);
router.post("/register", registerMember);
router.get("/all", requireAuth, getAllMembers);
router.get("/:id", requireAuth, getMemberById);
router.put("/status/:id", requireAuth, requireAdminOrVolunteer, updateMemberStatus);

export default router;