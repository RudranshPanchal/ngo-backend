import Task from "../../model/Task/task.js";
import Event from "../../model/Event/event.js";
import User from "../../model/Auth/auth.js";

export const createTask = async (req, res) => {
    try {
        const { title, description, eventId, assignedTo, priority, dueDate, estimatedHours } = req.body;

        // Validation
        if (!eventId || !assignedTo) {
            return res.status(400).json({ message: "Event and Assignee are required" });
        }

        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Check if user exists
        const user = await User.findById(assignedTo);
        if (!user) {
            return res.status(404).json({ message: "Volunteer not found" });
        }

        const task = await Task.create({
            title,
            description,
            event: eventId,
            assignedTo,
            priority,
            dueDate,
            estimatedHours,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "Task assigned successfully",
            data: task
        });
    } catch (error) {
        console.error("Create Task Error:", error);
        res.status(500).json({ message: "Failed to create task", error: error.message });
    }
};

export const getTasksByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        const tasks = await Task.find({ event: eventId })
            .populate("assignedTo", "fullName email contactNumber")
            .populate("createdBy", "fullName")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
    }
};

export const getMyTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user._id })
            .populate("event", "title eventDate location")
            .sort({ dueDate: 1 });

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch your tasks", error: error.message });
    }
};

export const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Allow Admin or the Assigned User to update
        if (task.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to update this task" });
        }

        task.status = status;
        await task.save();

        res.status(200).json({
            success: true,
            message: "Task status updated",
            data: task
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to update task", error: error.message });
    }
};