import Task from "../../model/Task/task.js";
import Event from "../../model/Event/event.js";
import User from "../../model/Auth/auth.js";
import Notification from "../../model/Notification/notification.js";

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
            createdBy: req.user._id,
            role: user.role || "volunteer",
        });

        try {
            // A. Save Notification to Database (So it shows up on refresh)
            const newNotification = await Notification.create({
                userType: "volunteer",
                userId: task.assignedTo, // Ensure this matches the volunteer's ID in your task model
                title: "New Task Assigned",
                message: `You have been assigned a new task: ${task.title}`,
                type: "task_assigned",
                role: "volunteer",
                read: false,
            });

            // B. Send Real-Time Socket Alert
            const io = req.app.get("io"); // Get the socket instance
            if (io) {
                // Emit to the specific volunteer's room we set up in Step 1
                io.to(`volunteer-${task.assignedTo}`).emit("volunteer-notification", newNotification);
                console.log("Socket notification sent to volunteer");
            }
        } catch (notifError) {
            console.error("Notification failed:", notifError);
            // Don't fail the request just because notification failed
        }
        // ---------------- END NOTIFICATION LOGIC ----------------

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

// For admin to view tasks of a specific volunteer
export const getVolunteerTasks = async (req, res) => {
    try {
        const { id } = req.params;

        const tasks = await Task.find({ assignedTo: id })
            .populate("event", "title")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            tasks,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


export const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        const currentUser = await User.findById(req.user._id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const task = await Task.findById(taskId).populate("event", "title");
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Allow Admin or the Assigned User to update
        if (task.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to update this task" });
        }

        task.status = status;
        await task.save();

        try {
            const eventName = task.event?.title || "General Task";

            // A. Save Notification to Database (So it shows up on refresh)
            const newNotification = await Notification.create({
                userType: "admin",
                title: `Task Update: ${eventName}`,
                message: `${currentUser.fullName} marked task "${task.title}" as ${status}`,
                type: "task_status_update",
                role: "volunteer",
                read: false,
            });

            // B. Send Real-Time Socket Alert
            const io = req.app.get("io"); // Get the socket instance
            if (io) {
                // Emit to the specific volunteer's room we set up in Step 1
                io.to("admins").emit("admin-notification", newNotification);
                console.log("Socket notification sent to admins");
            }
        } catch (notifError) {
            console.error("Notification failed:", notifError);
            // Don't fail the request just because notification failed
        }
        // ---------------- END NOTIFICATION LOGIC ----------------

        res.status(200).json({
            success: true,
            message: "Task status updated",
            data: task
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to update task", error: error.message });
    }
};