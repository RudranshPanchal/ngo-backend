import express from "express";
import {
  getAdminNotifications,
  markAllAsRead,
  getMemberNotifications,
  markNotificationAsRead,
  getVolunteerNotifications,
  markVolunteerNotificationsAsRead,
} from "../../controller/Notification/notification.js";
import { requireAuth, requireAdmin, requireVolunteer } from "../../middleware/auth.js";

const router = express.Router();

// TEST ROUTE (temporary)
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ADMIN NOTIFICATIONS
router.get("/admin", getAdminNotifications);
router.put("/admin/read", requireAuth, requireAdmin, markAllAsRead);

// MEMBER NOTIFICATIONS
router.get("/member", requireAuth, getMemberNotifications);
router.put("/:id/read", requireAuth, markNotificationAsRead);

// VOLUNTEER ROUTES
router.get("/volunteer", requireAuth, requireVolunteer, getVolunteerNotifications);
router.put("/volunteer/read", requireAuth, requireVolunteer, markVolunteerNotificationsAsRead);

export default router;
