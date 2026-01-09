import Event from "../../model/Event/event.js";

export const createEvent = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
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
            maxParticipants
        } = req.body;

        if (new Date(registrationDeadline) >= new Date(eventDate)) {
            return res.status(400).json({
                message: "Registration deadline must be before event date"
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
            createdBy: req.user._id
        });

        res.status(201).json({
            message: "Event created successfully",
            event
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create event" });
    }
};


export const listEvents = async (req, res) => {
    try {
        const events = await Event.find({ isDeleted: false }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        })
    } catch (e) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch events",
            error: e.message
        })
    }
}