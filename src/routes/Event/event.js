import express from "express";

import { createEvent, listEvents, updateEvent, deleteEvent, registerForEvent, unregisterFromEvent, getEventParticipants, getEventApplicants, getEventById, rejectApplicant } from "../../controller/Event/event.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
const eventRouter = express.Router();

eventRouter.post("/admin/create", requireAuth, requireAdmin, createEvent);
eventRouter.post("/create", requireAuth, createEvent);
eventRouter.put("/admin/update/:id", requireAuth, requireAdmin, updateEvent);
eventRouter.delete("/admin/delete/:id", requireAuth, requireAdmin, deleteEvent);
eventRouter.get("/admin/list", requireAuth, requireAdmin, listEvents);
eventRouter.get("/admin/:id/participants", requireAuth, requireAdmin, getEventParticipants);
eventRouter.get("/admin/:id/applicants", requireAuth, requireAdmin, getEventApplicants);
eventRouter.get("/admin/:id", requireAuth, requireAdmin, getEventById);
eventRouter.put("/admin/:id/reject-applicant", requireAuth, requireAdmin, rejectApplicant);

// For viewing Event list for other roles
eventRouter.get("/list", listEvents);

// Volunteer Registration Routes
eventRouter.post("/register/:id", requireAuth, registerForEvent);
eventRouter.post("/unregister/:id", requireAuth, unregisterFromEvent);

export default eventRouter;
