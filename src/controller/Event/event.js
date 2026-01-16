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

export const updateEvent = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const { id } = req.params;
        const updateData = req.body;

        // 1. Check if event exists
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // 2. Validate Dates if they are being updated
        // Use new date if provided, otherwise fallback to existing DB date
        if (updateData.eventDate || updateData.registrationDeadline) {
            const eventDate = updateData.eventDate ? new Date(updateData.eventDate) : new Date(event.eventDate);
            const deadline = updateData.registrationDeadline ? new Date(updateData.registrationDeadline) : new Date(event.registrationDeadline);

            if (deadline >= eventDate) {
                return res.status(400).json({
                    message: "Registration deadline must be before event date"
                });
            }
        }

        // 3. Perform Update
        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Event updated successfully",
            data: updatedEvent
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update event", error: err.message });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const { id } = req.params;

        const event = await Event.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({
            success: true,
            message: "Event deleted successfully"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete event", error: err.message });
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
        if (event.participants.some(p => p.toString() === userId.toString())) {
            return res.status(400).json({ message: "You are already registered for this event" });
        }

        // Check deadline
        if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: "Registration deadline has passed" });
        }

        // Check capacity
        if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
            return res.status(400).json({ message: "Event is fully booked" });
        }

        event.participants.push(userId);

        // Update currentParticipants if it exists in schema
        if (event.currentParticipants !== undefined) {
            event.currentParticipants = event.participants.length;
        }

        await event.save();

        res.status(200).json({
            success: true,
            message: "Successfully registered for event",
            data: event
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Registration failed", error: err.message });
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

        // Check if registered
        const index = event.participants.findIndex(p => p.toString() === userId.toString());
        if (index === -1) {
            return res.status(400).json({ message: "You are not registered for this event" });
        }

        event.participants.splice(index, 1);

        if (event.currentParticipants !== undefined) {
            event.currentParticipants = event.participants.length;
        }

        await event.save();

        res.status(200).json({
            success: true,
            message: "Successfully unregistered from event",
            data: event
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Unregistration failed", error: err.message });
    }
};