import Event from "../../model/Event/event.js";
import Notification from "../../model/Notification/notification.js";
import User from "../../model/Auth/auth.js";

/* ================= CREATE EVENT ================= */
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

    if (
      registrationDeadline &&
      eventDate &&
      new Date(registrationDeadline) >= new Date(eventDate)
    ) {
      return res.status(400).json({
        message: "Registration deadline must be before event date",
      });
    }

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

    /* 🔔 Notify Volunteers */
    try {
      const volunteers = await User.find({ role: "volunteer" }).select("_id");

      if (volunteers.length) {
        const notifications = volunteers.map((v) => ({
          userType: "volunteer",
          userId: v._id,
          title: "New Event Announced",
          message: `New event "${event.title}" is scheduled on ${new Date(
            event.eventDate
          ).toLocaleDateString()}.`,
          type: "event_created",
          role: "volunteer",
          read: false,
        }));

        const createdNotifications =
          await Notification.insertMany(notifications);

        const io = req.app.get("io");
        if (io) {
          createdNotifications.forEach((notif) => {
            io.to(`volunteer-${notif.userId}`).emit(
              "volunteer-notification",
              notif
            );
          });
        }
      }
    } catch (err) {
      console.error("Notification failed:", err);
    }

    res.status(201).json({ message: "Event created successfully", event });
  } catch (err) {
    res.status(500).json({ message: "Failed to create event" });
  }
};

/* ================= LIST EVENTS ================= */
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
    res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
};

/* ================= UPDATE EVENT ================= */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = event.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: "You don't have permission to update this event.",
      });
    }

    const updateData = req.body;

    if (updateData.eventDate || updateData.registrationDeadline) {
      const eventDate = updateData.eventDate
        ? new Date(updateData.eventDate)
        : new Date(event.eventDate);

      const deadline = updateData.registrationDeadline
        ? new Date(updateData.registrationDeadline)
        : new Date(event.registrationDeadline);

      if (deadline && eventDate && deadline >= eventDate) {
        return res.status(400).json({
          message: "Registration deadline must be before event date",
        });
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update event" });
  }
};

/* ================= DELETE EVENT ================= */
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = event.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Event.findByIdAndUpdate(id, { isDeleted: true });

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete event" });
  }
};
