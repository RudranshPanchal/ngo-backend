import express from "express";
import { createTask, getTasksByEvent, getMyTasks, updateTaskStatus, getVolunteerTasks } from "../../controller/Task/task.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";

const taskRouter = express.Router();

// Admin routes
taskRouter.post("/create", requireAuth, requireAdmin, createTask);
taskRouter.get("/event/:eventId", requireAuth, requireAdmin, getTasksByEvent);
taskRouter.get("/volunteer/:id/tasks", requireAuth, requireAdmin, getVolunteerTasks);

// Volunteer routes
taskRouter.get("/my-tasks", requireAuth, getMyTasks);
taskRouter.patch("/update-status/:taskId", requireAuth, updateTaskStatus);

export default taskRouter;
