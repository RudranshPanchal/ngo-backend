import express from "express";
import mongoose from "mongoose";
import Member from "../../model/Member/member.js";
import {
  registerMember,
  getAllMembers,
  updateMemberStatus,
} from "../../controller/Member/member.js";
import { requireAuth, requireAdminOrVolunteer } from "../../middleware/auth.js";

const router = express.Router();

router.post("/register", registerMember);
router.get("/all", requireAuth, getAllMembers);
router.get("/:id", async (req, res) => {
   try {
      const { id } = req.params;

      // 🔐 SAFETY CHECK (MANDATORY)
      if (!mongoose.Types.ObjectId.isValid(id)) {
         return res.status(400).json({ message: "Invalid Member ID" });
      }

      const member = await Member.findById(id);

      if (!member) {
         return res.status(404).json({ message: "Member not found" });
      }

      res.status(200).json({
         success: true,
         data: member
      });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
});
router.put("/status/:id", requireAuth, requireAdminOrVolunteer, updateMemberStatus);

export default router;