import express from "express";
import {
  verifyPhoneOtp,
  sendPhoneOtp,
  sendSignupOtp,
  verifySignupOtp,
  register,
  login,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  contactUs,
  createVolunteerByAdmin,
  createMemberByAdmin,
  getAllVolunteers,
  getAllMembers,
  givenCerification,
  getCertificateByMemberDetails,
  getAllCertification,
  getAdminDashboard,
  getRecentActivity,
  getUserDetails,
  updateUserDetails,
  sendEmailVerificationOtp,
  verifyEmailVerificationOtp,
  getMe,
  sendPhoneVerificationOtp,
  verifyPhoneVerificationOTP,
} from "../../controller/Auth/auth.js";
import {
  requireAuth,
  requireAdmin,
  requireAdminOrVolunteer,
} from "../../middleware/auth.js";
import {
  upload,
  pdfUpload,
  cloudinaryUpload,
  cloudinaryPdfUpload,
  cloudinaryImageUpload,
  cloudinaryMixedUpload,
} from "../../utils/multer.js";

const authRouter = express.Router();

// Auth API info
authRouter.get("/", (req, res) => {
  res.json({
    message: "Auth API endpoints",
    endpoints: {
      "POST /register": "User registration",
      "POST /login": "User login",
      "GET /me": "Get current user (requires auth)",
      "POST /changePassword": "Change password",
      "POST /forgotPassword": "Forgot password",
      "GET /getAllVolunteers": "Get all volunteers (requires auth)",
      "GET /getAllMembers": "Get all members (requires auth)",
    },
  });
});

// authRouter.post("/register", register);
authRouter.post("/signup/create-password", register);

authRouter.post("/signup/send-otp", sendSignupOtp);
authRouter.post("/signup/verify-otp", verifySignupOtp);

authRouter.post("/send-phone-otp", sendPhoneOtp);
authRouter.post("/verify-phone-otp", verifyPhoneOtp);

// User login
authRouter.post("/login", login);

// Logged In Email verification OTP
authRouter.post(
  "/send-email-verification-otp",
  requireAuth,
  sendEmailVerificationOtp,
);
authRouter.post(
  "/verify-email-verification-otp",
  requireAuth,
  verifyEmailVerificationOtp,
);

// Logged In Email verification OTP
authRouter.post(
  "/send-phone-verification-otp",
  requireAuth,
  sendPhoneVerificationOtp,
);
authRouter.post(
  "/verify-phone-verification-otp",
  requireAuth,
  verifyPhoneVerificationOTP,
);

// User Refresh
authRouter.get("/me", requireAuth, getMe);

// Change password (Authenticated user)
authRouter.post("/changePassword", changePassword);

// Forgot / Reset password (OTP flow)
authRouter.post("/forgotPassword", forgotPassword);
authRouter.post("/verifyResetOtp", verifyResetOtp);
authRouter.post("/resetPassword", resetPassword);

// Contact Us
authRouter.post("/contactUs", contactUs);

// Get current user details
authRouter.get("/me", requireAuth, getUserDetails);
authRouter.get("/profile", requireAuth, getUserDetails);

// Update current user details (with optional file: profilePic)
authRouter.put(
  "/updateMe",
  requireAuth,
  cloudinaryImageUpload.single("profilePic"),
  updateUserDetails,
);
authRouter.put("/updateProfile", requireAuth, updateUserDetails);

// Admin only route to create volunteers
authRouter.post(
  "/createVolunteerByAdmin",
  requireAuth,
  requireAdmin,
  cloudinaryUpload.single("uploadIdProof"),
  createVolunteerByAdmin,
);

// Admin or Volunteer can create members
authRouter.post(
  "/createMember",
  requireAuth,
  requireAdminOrVolunteer,
  createMemberByAdmin,
);

// Get all volunteers (Admin or Volunteer can access)
authRouter.get("/getAllVolunteers", requireAuth, getAllVolunteers);

// Get all members (Admin or Volunteer can access)
authRouter.get(
  "/getAllMembers",
  requireAuth,
  requireAdminOrVolunteer,
  getAllMembers,
);

// Admin only route to distribute certificates
authRouter.post(
  "/givenCerification/:userId",
  requireAuth,
  requireAdminOrVolunteer,
  cloudinaryMixedUpload.single("certificationDestribute"),
  givenCerification,
);

// Get certificates by memberId and dob
authRouter.post(
  "/getCertificateByMemberDetails",
  getCertificateByMemberDetails,
);

// Get all certificates (Admin or Volunteer can access)
authRouter.get(
  "/getAllCertification",
  requireAuth,
  requireAdminOrVolunteer,
  getAllCertification,
);

// Admin dashboard with counts (Admin only)
authRouter.get("/getAdminDashboard", requireAuth, getAdminDashboard);

// Recent activity (Admin or Volunteer can access)
authRouter.get("/getRecentActivity", requireAuth, getRecentActivity);

export default authRouter;
