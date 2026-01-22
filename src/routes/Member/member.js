import express from "express";
import {
  registerMember,
  issueIdCard,
  downloadIdCard,
  issueAppointmentLetter,
  downloadAppointmentLetter,
  approveMember,
  getAllMembers,
  getMemberById,
  updateMemberStatus,
  getMyProfile,
  updateMemberProfile,
  updateMemberDocuments,
  issueMembershipCertificate,
  downloadMembershipCertificate,
} from "../../controller/Member/member.js";

import {
  requireAuth,
  requireAdmin,
  optionalAuth,
} from "../../middleware/auth.js";

import { uploadMemberFiles } from "../../utils/multer.js";

const memberRouter = express.Router();

/* ================= REGISTER ================= */
memberRouter.post("/register", uploadMemberFiles, registerMember);

/* ================= PROFILE ================= */
memberRouter.get("/me", requireAuth, getMyProfile);
memberRouter.put("/profile", requireAuth, uploadMemberFiles, updateMemberProfile);

/* ================= ID CARD ================= */
memberRouter.put("/issue-id-card/:id", requireAuth, issueIdCard);
memberRouter.get("/download-id-card/:id", downloadIdCard);

/* ================= APPOINTMENT LETTER ================= */
memberRouter.put(
  "/issue-appointment-letter/:id",
  requireAuth,
  issueAppointmentLetter
);
memberRouter.get(
  "/download-appointment-letter/:id",
  // requireAuth,
  downloadAppointmentLetter
);
// memberRouter.get("/download-appointment-letter/:id", downloadAppointmentLetter);

/* ================= CERTIFICATE ================= */
memberRouter.put("/issue-certificate/:id", requireAuth, issueMembershipCertificate);
memberRouter.get("/download-certificate/:id", downloadMembershipCertificate);


/* ================= ADMIN ACTIONS ================= */
memberRouter.put(
  "/approve/:id",
  requireAuth,
  requireAdmin,
  approveMember
);

memberRouter.put(
  "/status/:id",
  requireAuth,
  requireAdmin,
  updateMemberStatus
);
memberRouter.put(
    "/upload-docs/:id", 
    requireAuth, 
    uploadMemberFiles,
    updateMemberDocuments
);

/* ================= FETCH ================= */
memberRouter.get("/", optionalAuth, getAllMembers);
memberRouter.get("/all", optionalAuth, getAllMembers);
memberRouter.get("/:id", optionalAuth, getMemberById);

export default memberRouter;
