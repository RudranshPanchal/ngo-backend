import express from "express";
import {
  getAdminNotifications,
  markAllAsRead,
  getMemberNotifications,
  markMemberNotificationsAsRead,
  markNotificationAsRead,
  getVolunteerNotifications,
  markVolunteerNotificationsAsRead,
  getDonorNotifications,
  markDonorNotificationsAsRead,
  getUserNotifications,
  markUserNotificationsAsRead,
} from "../../controller/Notification/notification.js";
import {
  requireAuth,
  requireAdmin,
  requireVolunteer,
} from "../../middleware/auth.js";

const router = express.Router();

// TEST ROUTE (temporary)
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ADMIN NOTIFICATIONS
router.get("/admin", getAdminNotifications);
router.put("/admin/read", requireAuth, requireAdmin, markAllAsRead);

// DONOR ROUTES
router.get("/donor", requireAuth, getDonorNotifications);
router.put("/donor/read", requireAuth, markDonorNotificationsAsRead);

// USER / FUNDRAISER ROUTES (Fixes 404 for FundraiserDashboard)
router.get("/user", requireAuth, getUserNotifications);
router.put("/user/read", requireAuth, markUserNotificationsAsRead);

// VOLUNTEER ROUTES
router.get(
  "/volunteer",
  requireAuth,
  requireVolunteer,
  getVolunteerNotifications,
);
router.put(
  "/volunteer/read",
  requireAuth,
  requireVolunteer,
  markVolunteerNotificationsAsRead,
);

// MEMBER NOTIFICATIONS
router.get("/member", requireAuth, getMemberNotifications);
router.put("/member/read", requireAuth, markMemberNotificationsAsRead);

// GENERIC ROUTES (Must be last to avoid conflict with specific routes like /admin/read)
router.put("/:id/read", requireAuth, markNotificationAsRead);

export default router;
