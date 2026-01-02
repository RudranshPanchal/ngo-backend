import express from "express";

import { createEvent, listEvents } from "../../controller/Event/event.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
const eventRouter = express.Router();

eventRouter.post(
  "/admin/create", requireAuth, requireAdmin, createEvent
);

eventRouter.get("/admin/list", requireAuth, requireAdmin, listEvents)

export default eventRouter;

