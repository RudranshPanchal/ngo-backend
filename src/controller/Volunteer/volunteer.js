import Volunteer from "../../model/Volunteer/volunteer.js";
import mongoose from 'mongoose';
import { sendEmail, sendVolunteerApplicationReceivedEmail, sendVolunteerWelcomeEmail, sendVolunteerRejectionEmail } from "../../utils/mail.js";
import { getLocalFileUrl } from "../../utils/multer.js";
import { generateTempPassword } from "../../utils/generateTempPassword.js";
import { uploadToCloudinary } from "../../utils/uploader.js";

import bcrypt from "bcrypt";
import User from "../../model/Auth/auth.js";
import Task from "../../model/Task/task.js";
import Event from "../../model/Event/event.js";
import EventApplication from "../../model/Event/eventApplication.js";
import { calculateVolunteerLevel } from "../../utils/volunteerLevel.js";
import Notification from "../../model/Notification/notification.js";
import { getVolunteerStatsService } from "../../services/volunteerStats.js";
import EventCertificate from "../../model/EventCertificate/eventCertificate.js";

// controller/Volunteer/volunteer.js

export const registerVolunteer = async (req, res) => {
  try {
    const files = req.files || {};
    let uploadIdProof = null;
    if (files.uploadIdProof && files.uploadIdProof[0]) {
      // Upload to Cloudinary
      uploadIdProof = await uploadToCloudinary(files.uploadIdProof[0], "volunteer-id-proofs");
      console.log("Uploaded ID Proof URL:", uploadIdProof);

      if (!uploadIdProof) {
        throw new Error("Cloudinary upload failed: No URL returned");
      }
    }

    let profilePhoto = null;
    if (files.profilePhoto && files.profilePhoto[0]) {
      profilePhoto = await uploadToCloudinary(files.profilePhoto[0], "volunteer-profile-photos");
    }

    const volunteerId = `VOL-${new mongoose.Types.ObjectId().toHexString().slice(-6).toUpperCase()}`;

    // Email check
    const email = req.body.email;
    const role = "volunteer";
    const emailInVolunteer = await Volunteer.findOne({ email });
    const emailInUser = await User.findOne({ email, role })
    if (emailInVolunteer || emailInUser) {
      return res.status(400).json({ success: false, message: "Email already registered for this role" });
    }

    const volunteerData = {
      ...req.body,
      volunteerId,
      uploadIdProof: uploadIdProof,
      profilePhoto: profilePhoto,
      isEmailVerified: req.body.isEmailVerified === 'true' || req.body.isEmailVerified === true,
      isPhoneVerified: req.body.isPhoneVerified === 'true' || req.body.isPhoneVerified === true,
    };

    const volunteer = new Volunteer(volunteerData);
    await volunteer.save();

    // Mail sending logic...
    // try {
    //     await sendVolunteerApplicationReceivedEmail({
    //         toEmail: volunteer.email,
    //         fullName: volunteer.fullName,
    //     });
    // } catch (e) { 
    //     console.log("Mail error:", e.message); 
    // }


    // Notification Logic
    try {
      // A. Save Notification to Database (So it shows up on refresh)
      const newNotification = await Notification.create({
        userType: "admin",
        title: "New Volunteer Registration",
        message: `New volunteer registered: ${volunteer.fullName}`,
        type: "registration",
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

    res.status(201).json({ success: true, volunteer });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error registering volunteer",
      error: error.message,
    });
  }
};
export const getAllVolunteers = async (req, res) => {
  try {
    const volunteers = await Volunteer.find().sort({ createdAt: -1 });
    res.json({ success: true, volunteers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --------------------Get Volunteer Dashboard Stats (Calculates & Updates DB)
// export const getVolunteerStats = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const volunteerRef = req.user.volunteerRef;


//     // 1. Calculate Task Stats
//     const totalTasks = await Task.countDocuments({ assignedTo: userId });
//     const completedTasks = await Task.countDocuments({ assignedTo: userId, status: 'completed' });

//     // Calculate Hours from completed tasks
//     const completedTasksList = await Task.find({ assignedTo: userId, status: 'completed' }).select('estimatedHours event');
//     const hoursContributed = completedTasksList.reduce((acc, curr) => acc + (Number(curr.estimatedHours) || 0), 0);

//     // Get IDs of events where user completed a task
//     const taskEventIds = completedTasksList
//       .filter(t => t.event)
//       .map(t => t.event);

//     // 2. Calculate Event Stats
//     // Check both Event participants (User ID) AND EventApplication (Volunteer ID)
//     const completedEvents = await Event.find({
//       participants: new mongoose.Types.ObjectId(userId),
//       status: 'completed'
//     }).select('_id');

//     // Also check events where user completed a task (and event is completed)
//     const taskBasedEvents = await Event.find({
//       _id: { $in: taskEventIds },
//       status: 'completed'
//     }).select('_id');

//     let attendedApplications = [];
//     if (volunteerRef) {
//       attendedApplications = await EventApplication.find({
//         volunteerId: new mongoose.Types.ObjectId(volunteerRef),
//         status: 'attended'
//       }).select('eventId');
//     }

//     const uniqueEventIds = new Set([
//       ...completedEvents.map(e => e._id.toString()),
//       ...taskBasedEvents.map(e => e._id.toString()),
//       ...attendedApplications.map(a => a.eventId.toString())
//     ]);

//     const eventsAttended = uniqueEventIds.size;

//     // 3. Calculate Impact Score
//     // Logic: 10 pts per task, 5 pts per hour, 20 pts per event
//     const impactScore = (completedTasks * 10) + (hoursContributed * 5) + (eventsAttended * 20);

//     // 4. Calculate level based on Impact Score
//     const levelData = calculateVolunteerLevel(impactScore || 0);

//     // 5. Update User Profile (So Leaderboard works correctly)
//     await User.findByIdAndUpdate(userId, {
//       impactScore,
//       hoursVolunteered: hoursContributed,
//       volunteerLevel: levelData.level,
//       volunteerLevelName: levelData.name
//     });

//     res.json({
//       success: true,
//       stats: {
//         totalTasks,
//         completedTasks,
//         hoursContributed,
//         eventsAttended,
//         impactScore,
//         level: levelData.level,
//         levelName: levelData.name,
//         certificatesEarned: 0 // Placeholder for now
//       }
//     });
//   } catch (error) {
//     console.error("Stats error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


// export const getVolunteerStats = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // 1. TASK STATS
//     const totalTasks = await Task.countDocuments({ assignedTo: userId });
//     const completedTasks = await Task.countDocuments({
//       assignedTo: userId,
//       status: 'completed'
//     });

//     const completedTasksList = await Task.find({
//       assignedTo: userId,
//       status: 'completed'
//     }).select('estimatedHours event');

//     const hoursContributed = completedTasksList.reduce(
//       (acc, curr) => acc + (Number(curr.estimatedHours) || 0),
//       0
//     );

//     // 2. EVENT IDS FROM TASKS
//     // const taskEventIds = completedTasksList
//     //   .filter(t => t.event)
//     //   .map(t => t.event.toString());

//     // 3. EVENTS VIA TASKS (NO STATUS CHECK)
//     // const taskBasedEvents = await Event.find({
//     //   _id: { $in: taskEventIds }
//     // }).select('_id');

//     // 4. EVENTS VIA PARTICIPATION

//     const uniqueEventIds = new Set(
//       completedTasksList
//         .filter(t => t.event)
//         .map(t => t.event.toString())
//     );

//     const eventsAttended = uniqueEventIds.size;


//     // const participantEvents = await Event.find({
//     //   participants: userId
//     // }).select('_id');

//     // const uniqueEventIds = new Set([
//     //   ...taskBasedEvents.map(e => e._id.toString()),
//     //   ...participantEvents.map(e => e._id.toString())
//     // ]);

//     // const eventsAttended = uniqueEventIds.size;

//     // 5. IMPACT SCORE
//     const impactScore =
//       (completedTasks * 10) +
//       (hoursContributed * 5) +
//       (eventsAttended * 20);

//     // 6. LEVEL
//     const levelData = calculateVolunteerLevel(impactScore);

//     // 7. UPDATE USER
//     await User.findByIdAndUpdate(userId, {
//       impactScore,
//       hoursVolunteered: hoursContributed,
//       volunteerLevel: levelData.level,
//       volunteerLevelName: levelData.name
//     });

//     res.json({
//       success: true,
//       stats: {
//         totalTasks,
//         completedTasks,
//         hoursContributed,
//         eventsAttended,
//         impactScore,
//         level: levelData.level,
//         levelName: levelData.name,
//         certificatesEarned: 0
//       }
//     });
//   } catch (error) {
//     console.error("Stats error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// for Volunteers 
export const getVolunteerStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await getVolunteerStatsService(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// for Admins
export const getVolunteerStatsById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Prevent collision & Validate ID
    if (id === 'stats' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Volunteer ID" });
    }

    // 2. Role Check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // 3. Resolve User ID from Volunteer ID
    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: "Volunteer not found" });
    }

    let targetUserId = volunteer.userRef;

    // Fallback: Try to find user by email if userRef is missing
    if (!targetUserId) {
      const user = await User.findOne({ email: volunteer.email });
      if (user) targetUserId = user._id;
    }

    if (!targetUserId) {
      return res.status(404).json({ success: false, message: "Linked User account not found" });
    }

    const stats = await getVolunteerStatsService(targetUserId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Volunteer Tasks by Volunteer ID (Admin View)
export const getVolunteerTasksById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Volunteer ID" });
    }

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: "Volunteer not found" });
    }

    // Resolve User ID from Volunteer
    let targetUserId = volunteer.userRef;
    if (!targetUserId) {
      const user = await User.findOne({ email: volunteer.email });
      if (user) targetUserId = user._id;
    }

    if (!targetUserId) {
      return res.json({ success: true, tasks: [] });
    }

    const tasks = await Task.find({ assignedTo: targetUserId }).sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (error) {
    console.error("Error fetching volunteer tasks:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user._id;

    const certificates = await EventCertificate.find({
      recipient: userId,
      // role: 'volunteer'
    })
      .populate("event", "title eventDate category")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch certificates"
    });
  }
};


//  DEBUG: Seed Data for Stats
// export const seedVolunteerStatsData = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const volunteerRef = req.user.volunteerRef;

//     if (!volunteerRef) {
//       return res.status(400).json({ message: "User is not linked to a volunteer profile" });
//     }

//     // 1. Create/Update a Completed Event where user is participant
//     let event = await Event.findOne({ title: "Debug Completed Event" });
//     if (!event) {
//       event = await Event.create({
//         title: "Debug Completed Event",
//         description: "Auto-generated for debugging stats",
//         category: "Community",
//         status: "completed",
//         eventDate: new Date(),
//         maxParticipants: 100,
//         createdBy: userId, 
//         participants: [userId] // <--- Adds you here
//       });
//     } else {
//       if (!event.participants.includes(userId)) {
//         event.participants.push(userId);
//         await event.save();
//       }
//     }

//     // 2. Create/Update an Attended Application
//     let appEvent = await Event.findOne({ title: "Debug Attended Event" });
//     if (!appEvent) {
//       appEvent = await Event.create({
//         title: "Debug Attended Event",
//         description: "Auto-generated for debugging application stats",
//         category: "Workshop",
//         status: "completed",
//         eventDate: new Date(),
//         maxParticipants: 100,
//         createdBy: userId
//       });
//     }

//     await EventApplication.findOneAndUpdate(
//       { eventId: appEvent._id, volunteerId: volunteerRef },
//       { status: "attended", appliedAt: new Date(), attendedAt: new Date() },
//       { upsert: true, new: true }
//     );

//     res.json({ success: true, message: "Debug data seeded! Refresh your dashboard." });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// Get Volunteer Leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    // Fetch users with role 'volunteer'
    // Select specific fields to reduce payload size
    // Sort by impactScore in descending order (-1)
    // Limit to top 50 or 100
    const leaderboard = await User.find({ role: "volunteer" })
      .select("fullName profilePic impactScore hoursVolunteered badges volunteerLevel volunteerLevelName profilePhoto")
      .sort({ impactScore: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
      error: error.message,
    });
  }
};



export const getVolunteerById = async (req, res) => {
  try {
    const { id } = req.params;

    const volunteer = await Volunteer.findById(id);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    res.json({
      success: true,
      volunteer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching volunteer",
      error: error.message,
    });
  }
};



// export const updateVolunteerStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, password } = req.body;

//     if (!id)
//       return res.status(400).json({ success: false, error: "Missing id" });

//     const volunteer = await Volunteer.findById(id);
//     console.log("FOUND VOLUNTEER:", volunteer ? volunteer.email : "NOT FOUND");

//     if (!volunteer)
//       return res.status(404).json({ success: false, error: "Volunteer not found" });

//     // update status
//     volunteer.status = status;
//     await volunteer.save();

//     // DEBUG if approved block will run or not
//     console.log("Should create user?", status === "approved" && password ? "YES" : "NO");

//     // Always connect volunteer → user using volunteerId
//     // let existingUser = await User.findOne({ memberId: volunteer.volunteerId });

//     let user = await User.findOne({ email: volunteer.email });

//     const hashed = await bcrypt.hash(password, 10);

//     if (user) {
//       console.log("Updating existing volunteer user...");

//       user.fullName = volunteer.fullName;
//       user.password = hashed;
//       user.role = "volunteer";
//       user.volunteerRef = volunteer._id;

//       user.contactNumber = volunteer.contactNumber || "";
//       user.address = volunteer.address || "";
//       user.gender = volunteer.gender || "";
//       user.dob = volunteer.dob || "";
//       user.areaOfVolunteering = volunteer.areaOfVolunteering;
//       user.availability = volunteer.availability;

//       user.skills = Array.isArray(volunteer.skills)
//         ? volunteer.skills
//         : (volunteer.skills || "").split(",").map(s => s.trim());

//       user.profession = volunteer.profession || "";
//       user.uploadIdProof = volunteer.uploadIdProof || "";

//       user.tempPassword = false;

//       user.emailVerified = volunteer.isEmailVerified === true;
//       user.phoneVerified = volunteer.isPhoneVerified === true;

//       await user.save();
//     }

//     // CASE 2: USER DOES NOT EXIST
//     else {
//       console.log("Creating NEW volunteer user...");

//       const cleanName = (fullName || "member")
//         .toLowerCase()
//         .replace(/\s+/g, "");

//       const uniqueSuffix = Math.random().toString(36).substring(2, 6);

//       const memberId = `${cleanName}-${uniqueSuffix}`;

//       await User.create({
//         fullName: volunteer.fullName,
//         email: volunteer.email,
//         password: hashed,
//         role: "volunteer",
//         memberId: memberId,
//         volunteerRef: volunteer._id,

//         contactNumber: volunteer.contactNumber,
//         address: volunteer.address,
//         gender: volunteer.gender,
//         dob: volunteer.dob,

//         areaOfVolunteering: volunteer.areaOfVolunteering,
//         availability: volunteer.availability,

//         skills: Array.isArray(volunteer.skills)
//           ? volunteer.skills
//           : (volunteer.skills || "").split(",").map(s => s.trim()),

//         profession: volunteer.profession,
//         uploadIdProof: volunteer.uploadIdProof,
//         tempPassword: true
//       });
//     }

//     //  back-link volunteer → user (RECOMMENDED)
//     volunteer.userRef = user._id;
//     await volunteer.save();


//     //  SOURCE OF TRUTH
//     const emailVerified = volunteer.isEmailVerified === true;
//     const phoneVerified = volunteer.isPhoneVerified === true;

//     //  ALWAYS SYNC VERIFICATION (even if password not sent)
//     await User.updateOne(
//       { memberId: volunteer.volunteerId },
//       {
//         $set: {
//           emailVerified,
//           phoneVerified
//         }
//       }
//     );

//     // PASSWORD LOGIC ONLY WHEN PROVIDED
//     if (status === "approved" && password) {
//       const hashed = await bcrypt.hash(password, 10);

//       await User.updateOne(
//         { memberId: volunteer.volunteerId },
//         {
//           $set: {
//             password: hashed,
//             tempPassword: false
//           }
//         }
//       );

//       // try {
//       //   await sendVolunteerWelcomeEmail({
//       //     toEmail: volunteer.email,
//       //     fullName: volunteer.fullName,
//       //     email: volunteer.email,
//       //     password,
//       //     volunteerId: volunteer.volunteerId
//       //   });
//       // } catch (_) {}
//     }

//     // rejection mail
//     // if (status === "rejected") {
//     //   try {
//     //     await sendVolunteerRejectionEmail({
//     //       toEmail: volunteer.email,
//     //       fullName: volunteer.fullName,
//     //       volunteerId: volunteer.volunteerId
//     //     });
//     //   } catch (_) {}
//     // }

//     return res.json({ success: true, volunteer });

//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };


// Admin manually write pass
// export const updateVolunteerStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, password } = req.body;

//     if (!id)
//       return res.status(400).json({ success: false, error: "Missing id" });

//     const volunteer = await Volunteer.findById(id);
//     if (!volunteer)
//       return res.status(404).json({ success: false, error: "Volunteer not found" });

//     // update volunteer status
//     volunteer.status = status;
//     await volunteer.save();

//     // Only proceed if approved
//     if (status !== "approved") {
//       return res.json({ success: true, volunteer });
//     }

//     // Identity check ALWAYS by email
//     let user = await User.findOne({ email: volunteer.email });

//     // hash password only if provided
//     let hashedPassword = null;
//     if (password) {
//       hashedPassword = await bcrypt.hash(password, 10);
//     }

//     // -----------------------------
//     // CASE 1: USER ALREADY EXISTS
//     // -----------------------------
//     if (user) {
//       user.role = "volunteer";
//       user.volunteerRef = volunteer._id;

//       user.fullName = volunteer.fullName;
//       user.contactNumber = volunteer.contactNumber || "";
//       user.address = volunteer.address || "";
//       user.gender = volunteer.gender || "";
//       user.dob = volunteer.dob || "";
//       user.areaOfVolunteering = volunteer.areaOfVolunteering;
//       user.availability = volunteer.availability;

//       user.emergencyContactNumber = volunteer.emergencyContactNumber;

//       user.skills = Array.isArray(volunteer.skills)
//         ? volunteer.skills
//         : (volunteer.skills || "").split(",").map(s => s.trim());

//       user.profession = volunteer.profession || "";
//       user.uploadIdProof = volunteer.uploadIdProof || "";

//       if (hashedPassword) {
//         user.password = hashedPassword;
//         user.tempPassword = false;
//       }

//       user.emailVerified = volunteer.isEmailVerified === true;
//       user.phoneVerified = volunteer.isPhoneVerified === true;

//       await user.save();
//     }

//     // -----------------------------
//     // CASE 2: USER DOES NOT EXIST
//     // -----------------------------
//     else {
//       console.log("VOLUNTEER ID", volunteer._id);

//       const cleanName = (volunteer.fullName || "member")
//         .toLowerCase()
//         .replace(/\s+/g, "");

//       const uniqueSuffix = Math.random().toString(36).substring(2, 6);
//       const memberId = `${cleanName}-${uniqueSuffix}`;

//       user = await User.create({
//         fullName: volunteer.fullName,
//         email: volunteer.email,
//         password: hashedPassword,
//         role: "volunteer",
//         memberId,

//         volunteerRef: volunteer._id,

//         contactNumber: volunteer.contactNumber,
//         emergencyContactNumber: volunteer.emergencyContactNumber,
//         address: volunteer.address,
//         gender: volunteer.gender,
//         dob: volunteer.dob,

//         areaOfVolunteering: volunteer.areaOfVolunteering,
//         availability: volunteer.availability,

//         skills: Array.isArray(volunteer.skills)
//           ? volunteer.skills
//           : (volunteer.skills || "").split(",").map(s => s.trim()),

//         profession: volunteer.profession,
//         uploadIdProof: volunteer.uploadIdProof,

//         emailVerified: volunteer.isEmailVerified === true,
//         phoneVerified: volunteer.isPhoneVerified === true,

//         tempPassword: true
//       });
//     }

//     // 🔗 back-link volunteer → user (RECOMMENDED)
//     volunteer.userRef = user._id;
//     await volunteer.save();

//     return res.json({ success: true, volunteer });

//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };



// -------------------------System generate temp password-----------------------
export const updateVolunteerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // const { status, password } = req.body; // ❌ OLD ADMIN PASSWORD FLOW

    if (!id)
      return res.status(400).json({ success: false, error: "Missing id" });

    const volunteer = await Volunteer.findById(id);
    if (!volunteer)
      return res.status(404).json({ success: false, error: "Volunteer not found" });

    // update volunteer status
    volunteer.status = status;
    await volunteer.save();

    // Block logic
    if (status === "blocked") {
      await User.findOneAndUpdate(
        { email: volunteer.email },
        { isBlocked: true,
          tempPassword: false
         }
      );
      return res.json({ success: true, message: "Volunteer and User login blocked successfully", volunteer });
    }

    // Only proceed if approved
    if (status !== "approved") {
      return res.json({ success: true, volunteer });
    }

    //  AUTO-GENERATED TEMP PASSWORD
    const tempPassword = generateTempPassword(volunteer.fullName, volunteer.dob);
    console.log(tempPassword);

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Identity check ALWAYS by email
    let user = await User.findOne({ email: volunteer.email });

    // CASE 1: USER ALREADY EXISTS
    if (user) {
      user.role = "volunteer";
      user.volunteerRef = volunteer._id;

      user.isBlocked = false;
      user.fullName = volunteer.fullName;
      user.contactNumber = volunteer.contactNumber || "";
      user.address = volunteer.address || "";
      user.gender = volunteer.gender || "";
      user.dob = volunteer.dob || "";
      user.areaOfVolunteering = volunteer.areaOfVolunteering;
      user.availability = volunteer.availability;

      user.emergencyContactNumber = volunteer.emergencyContactNumber;

      user.skills = Array.isArray(volunteer.skills)
        ? volunteer.skills
        : (volunteer.skills || "").split(",").map(s => s.trim());

      user.profession = volunteer.profession || "";
      user.uploadIdProof = volunteer.uploadIdProof || "";
      user.profilePhoto = volunteer.profilePhoto || "";

      // SYSTEM PASSWORD
      // user.password = hashedPassword;
      // user.tempPassword = true;

      user.emailVerified = volunteer.isEmailVerified === true;
      user.phoneVerified = volunteer.isPhoneVerified === true;

      await user.save();
    }

    // CASE 2: USER DOES NOT EXIST
    else {
      const cleanName = (volunteer.fullName || "member")
        .toLowerCase()
        .replace(/\s+/g, "");

      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const memberId = `${cleanName}-${uniqueSuffix}`;

      user = await User.create({
        fullName: volunteer.fullName,
        email: volunteer.email,
        password: hashedPassword,
        role: "volunteer",
        profilePhoto: volunteer.profilePhoto || "",
        memberId,

        volunteerRef: volunteer._id,

        contactNumber: volunteer.contactNumber,
        emergencyContactNumber: volunteer.emergencyContactNumber,
        address: volunteer.address,
        gender: volunteer.gender,
        dob: volunteer.dob,

        areaOfVolunteering: volunteer.areaOfVolunteering,
        availability: volunteer.availability,

        skills: Array.isArray(volunteer.skills)
          ? volunteer.skills
          : (volunteer.skills || "").split(",").map(s => s.trim()),

        profession: volunteer.profession,
        uploadIdProof: volunteer.uploadIdProof,

        impactScore: 0,
        hoursVolunteered: 0,
        badges: [],
        volunteerLevel: 1,
        volunteerLevelName: "Beginner",

        emailVerified: volunteer.isEmailVerified === true,
        phoneVerified: volunteer.isPhoneVerified === true,

        tempPassword: true
      });
    }

    // back-link volunteer → user
    volunteer.userRef = user._id;
    await volunteer.save();

    // TODO: send email with tempPassword
    // sendVolunteerApprovalEmail(user.email, tempPassword);

    return res.json({
      success: true,
      volunteer,
      tempPassword
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
