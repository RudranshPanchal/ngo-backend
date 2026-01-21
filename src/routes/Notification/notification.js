import express from "express";
import {
  getAdminNotifications,
  markAllAsRead,
  getMemberNotifications,
  markNotificationAsRead,
} from "../../controller/Notification/notification.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";

const router = express.Router();

// ✅ TEST ROUTE (temporary)
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ✅ ADMIN NOTIFICATIONS
router.get("/admin", getAdminNotifications);
router.put("/admin/read", requireAuth, requireAdmin, markAllAsRead);

// ✅ MEMBER NOTIFICATIONS
router.get("/member", requireAuth, getMemberNotifications);
router.put("/:id/read", requireAuth, markNotificationAsRead);

export default router;
