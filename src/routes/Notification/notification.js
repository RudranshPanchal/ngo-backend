import express from "express";
import {
  getAdminNotifications,
  markAllAsRead,
  getVolunteerNotifications,
  markVolunteerNotificationsAsRead,
} from "../../controller/Notification/notification.js";
import { requireAuth, requireAdmin, requireVolunteer } from "../../middleware/auth.js";

const router = express.Router();

// ✅ TEST ROUTE (temporary)
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ✅ GET ADMIN NOTIFICATIONS
router.get("/admin", getAdminNotifications);
// (baad me secure karna ho to requireAuth, requireAdmin add kar sakte ho)

// ✅ MARK ALL AS READ
router.put("/admin/read", requireAuth, requireAdmin, markAllAsRead);

// ✅ VOLUNTEER ROUTES
router.get("/volunteer", requireAuth, requireVolunteer, getVolunteerNotifications);
router.put("/volunteer/read", requireAuth, requireVolunteer, markVolunteerNotificationsAsRead);

export default router;
