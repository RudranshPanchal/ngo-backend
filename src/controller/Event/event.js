import Event from "../../model/Event/event.js";
import Notification from "../../model/Notification/notification.js";
import User from "../../model/Auth/auth.js";

// export const createEvent = async (req, res) => {
//     try {
//         if (req.user.role !== "admin") {
//             return res.status(403).json({ message: "Access denied" });
//         }

//         const {
//             title,
//             description,
//             category,
//             eventDate,
//             startTime,
//             endTime,
//             registrationDeadline,
//             location,
//             organizerName,
//             requirements,
//             maxParticipants
//         } = req.body;

//         if (new Date(registrationDeadline) >= new Date(eventDate)) {
//             return res.status(400).json({
//                 message: "Registration deadline must be before event date"
//             });
//         }

//         const event = await Event.create({
//             title,
//             description,
//             category,
//             eventDate,
//             startTime,
//             endTime,
//             registrationDeadline,
//             location,
//             organizerName,
//             requirements,
//             maxParticipants,
//             createdBy: req.user._id
//         });

//         try {
//             // 1. Find all volunteers
//             const volunteers = await User.find({ role: "volunteer" }).select("_id");

//             if (volunteers.length > 0) {
//                 // 2. Prepare notifications for each volunteer
//                 const notifications = volunteers.map((vol) => ({
//                     userType: "volunteer",
//                     userId: vol._id,
//                     title: "New Event Announced",
//                     message: `New event "${event.title}" is scheduled on ${new Date(event.eventDate).toLocaleDateString()}.`,
//                     type: "event_created",
//                     role: "volunteer",
//                     read: false,
//                 }));

//                 // 3. Bulk Insert
//                 const createdNotifications = await Notification.insertMany(notifications);

//                 // 4. Send Real-Time Socket Alerts
//                 const io = req.app.get("io");
//                 if (io) {
//                     createdNotifications.forEach((notif) => {
//                         io.to(`volunteer-${notif.userId}`).emit("volunteer-notification", notif);
//                     });
//                     console.log(`Notification sent to ${volunteers.length} volunteers`);
//                 }
//             }
//         } catch (notifError) {
//             console.error("Notification failed:", notifError);
//             // Don't fail the request just because notification failed
//         }
//         // ---------------- END NOTIFICATION LOGIC ----------------

//         res.status(201).json({
//             message: "Event created successfully",
//             event
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Failed to create event" });
//     }
// };
export const createEvent = async (req, res) => {
  try {
    const allowedRoles = ["admin", "member"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Only Admins and Members can create events.",
      });
    }

    const {
      title,
      description,
      category,
      eventDate,
      startTime,
      endTime,
      registrationDeadline,
      location,
      organizerName,
      requirements,
      maxParticipants,
    } = req.body;

    const event = await Event.create({
      title,
      description,
      category,
      eventDate,
      startTime,
      endTime,
      registrationDeadline,
      location,
      organizerName,
      requirements,
      maxParticipants,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Event created successfully", event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create event" });
  }
};

export const listEvents = async (req, res) => {
  try {
    const events = await Event.find({ isDeleted: false }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: e.message,
    });
  }
};

// export const updateEvent = async (req, res) => {
//     try {
//         if (req.user.role !== "admin") {
//             return res.status(403).json({ message: "Access denied" });
//         }

//         const { id } = req.params;
//         const updateData = req.body;

//         const event = await Event.findById(id);
//         if (!event) {
//             return res.status(404).json({ message: "Event not found" });
//         }

//         if (updateData.eventDate || updateData.registrationDeadline) {
//             const eventDate = updateData.eventDate ? new Date(updateData.eventDate) : new Date(event.eventDate);
//             const deadline = updateData.registrationDeadline ? new Date(updateData.registrationDeadline) : new Date(event.registrationDeadline);

//             if (deadline >= eventDate) {
//                 return res.status(400).json({
//                     message: "Registration deadline must be before event date"
//                 });
//             }
//         }

//         const updatedEvent = await Event.findByIdAndUpdate(
//             id,
//             { $set: updateData },
//             { new: true, runValidators: true }
//         );

//         res.status(200).json({
//             success: true,
//             message: "Event updated successfully",
//             data: updatedEvent
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Failed to update event", error: err.message });
//     }
// };
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    // ✅ Permission Check: Admin can update anything, Member only their own events
    const isOwner = event.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this event." });
    }

    const updateData = req.body;
    // ... Date validation logic ...

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update event", error: err.message });
  }
};
export const deleteEvent = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const event = await Event.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to delete event", error: err.message });
  }
};

//  Volunteer / Member Events Registration

export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event || event.isDeleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Ensure participants array exists
    if (!event.participants) {
      event.participants = [];
    }

    // Check if already registered
    if (event.participants.some((p) => p.toString() === userId.toString())) {
      return res
        .status(400)
        .json({ message: "You are already registered for this event" });
    }

    // Check if event is full
    if (
      event.maxParticipants &&
      event.participants.length >= event.maxParticipants
    ) {
      return res.status(400).json({ message: "Event is full" });
    }

    // Check deadline
    if (
      event.registrationDeadline &&
      new Date() > new Date(event.registrationDeadline)
    ) {
      return res
        .status(400)
        .json({ message: "Registration deadline has passed" });
    }

    // Add to participants directly
    event.participants.push(userId);
    event.currentParticipants = event.participants.length;
    event.markModified("participants");
    event.markModified("currentParticipants");

    await event.save();

    res.status(200).json({
      success: true,
      message: "Successfully registered for event.",
      data: event,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

export const unregisterFromEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event || event.isDeleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Ensure participants array exists
    if (!event.participants) {
      event.participants = [];
    }
    if (!event.applicants) {
      event.applicants = [];
    }

    // Check if registered or applied
    const partIndex = event.participants.findIndex(
      (p) => p.toString() === userId.toString(),
    );
    const appIndex = event.applicants.findIndex(
      (a) => a.toString() === userId.toString(),
    );

    if (partIndex === -1 && appIndex === -1) {
      return res
        .status(400)
        .json({ message: "You are not registered or applied for this event" });
    }

    if (partIndex !== -1) event.participants.splice(partIndex, 1);
    if (appIndex !== -1) event.applicants.splice(appIndex, 1);

    event.currentParticipants = event.participants.length;
    event.markModified("participants");
    event.markModified("currentParticipants");

    await event.save();

    res.status(200).json({
      success: true,
      message: "Successfully withdrawn from event",
      data: event,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Unregistration failed", error: err.message });
  }
};

export const getEventParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id).populate(
      "participants",
      "fullName email contactNumber skills role",
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      count: event.participants.length,
      data: event.participants,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch participants", error: error.message });
  }
};

export const getEventApplicants = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id).populate(
      "applicants",
      "fullName email contactNumber skills role",
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      count: (event.applicants || []).length,
      data: event.applicants || [],
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch applicants", error: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate("createdBy", "fullName");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch event details", error: error.message });
  }
};

export const rejectApplicant = async (req, res) => {
  try {
    const { id } = req.params; // Event ID
    const { userId } = req.body; // Applicant ID

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.applicants) {
      event.applicants.pull(userId);
      await event.save();
    }

    res.status(200).json({
      success: true,
      message: "Applicant rejected successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to reject applicant", error: error.message });
  }
};

export const getAssignedTasks = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find events where the user is listed in participants
    const tasks = await Event.find({
      participants: userId,
      isDeleted: false,
    }).sort({ eventDate: 1 });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch assigned tasks",
      error: error.message,
    });
  }
};
