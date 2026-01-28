import express from "express";
import { generateEventCertificate, getEventCertificates, deleteEventCertificate, downloadEventCertificate } from "../../controller/EventCertificate/eventCertificate.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";

const router = express.Router();

// Generate a new event certificate
router.post("/generate", requireAuth, requireAdmin, generateEventCertificate);

// Get all certificates for a specific event
router.get("/event/:eventId", requireAuth, requireAdmin, getEventCertificates);

// Delete a certificate
router.delete("/delete/:id", requireAuth, requireAdmin, deleteEventCertificate);

// Download certificate (Proxy)
router.get("/download/:id", requireAuth, downloadEventCertificate);

export default router;
