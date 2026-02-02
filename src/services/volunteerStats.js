import Task from "../model/Task/task.js";
import User from "../model/Auth/auth.js";
import { calculateVolunteerLevel } from "../utils/volunteerLevel.js";
import eventCertificate from "../model/EventCertificate/eventCertificate.js";

export const getVolunteerStatsService = async (userId) => {
  if (!userId) {
    throw new Error("Volunteer ID is required");
  }

  // 1. TASK STATS
  const totalTasks = await Task.countDocuments({ assignedTo: userId });

  const completedTasks = await Task.countDocuments({
    assignedTo: userId,
    status: "completed",
  });

  const completedTasksList = await Task.find({
    assignedTo: userId,
    status: "completed",
  }).select("estimatedHours event");

  const hoursContributed = completedTasksList.reduce(
    (acc, curr) => acc + (Number(curr.estimatedHours) || 0),
    0
  );

  // 2. UNIQUE EVENTS (BASED ON COMPLETED TASKS)
  const uniqueEventIds = new Set(
    completedTasksList
      .filter((t) => t.event)
      .map((t) => t.event.toString())
  );

  const eventsAttended = uniqueEventIds.size;

  // 3. IMPACT SCORE
  const impactScore =
    completedTasks * 10 +
    hoursContributed * 5 +
    eventsAttended * 20;

  // 4. LEVEL
  const levelData = calculateVolunteerLevel(impactScore);

  // 5. CERTIFICATES EARNED
  const certificatesEarned = await eventCertificate.countDocuments({
    recipient: userId,
  });

  // 6. UPDATE USER (SIDE EFFECT — OK IN SERVICE)
  await User.findByIdAndUpdate(userId, {
    impactScore,
    hoursVolunteered: hoursContributed,
    volunteerLevel: levelData.level,
    volunteerLevelName: levelData.name,
    certificatesEarned,
  });

  return {
    totalTasks,
    completedTasks,
    hoursContributed,
    eventsAttended,
    impactScore,
    level: levelData.level,
    levelName: levelData.name,
    certificatesEarned,
  };
};
