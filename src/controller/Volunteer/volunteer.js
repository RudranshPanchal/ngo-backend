import Volunteer from "../../model/Volunteer/volunteer.js";
import mongoose from 'mongoose';
import { sendEmail, sendVolunteerApplicationReceivedEmail, sendVolunteerWelcomeEmail, sendVolunteerRejectionEmail } from "../../utils/mail.js";
import { getLocalFileUrl } from "../../utils/multer.js";
import { generateTempPassword } from "../../utils/generateTempPassword.js";

import bcrypt from "bcrypt";
import User from "../../model/Auth/auth.js";

// controller/Volunteer/volunteer.js

export const registerVolunteer = async (req, res) => {
  try {
    if (req.file) {
      req.body.uploadIdProof = getLocalFileUrl(req.file);
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
    // Fallback demo data when DB is not available
    const demoVolunteers = [
      {
        _id: '1',
        fullName: 'Priya Sharma',
        email: 'priya@example.com',
        contactNumber: '+91 98765 43210',
        skills: 'Teaching, Communication',
        areaOfVolunteering: 'fieldWork',
        availability: 'morning',
        status: 'approved',
        volunteerId: 'VOL0001',
        createdAt: new Date().toISOString()
      }
    ];
    res.json({ success: true, volunteers: demoVolunteers });
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

//     // 🔗 back-link volunteer → user (RECOMMENDED)
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

    // Only proceed if approved
    if (status !== "approved") {
      return res.json({ success: true, volunteer });
    }

    // ---------------------------------
    // 🔐 AUTO-GENERATED TEMP PASSWORD
    // ---------------------------------
    const tempPassword = generateTempPassword(volunteer.fullName, volunteer.dob);
    console.log(tempPassword);
    
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Identity check ALWAYS by email
    let user = await User.findOne({ email: volunteer.email });

    // -----------------------------
    // CASE 1: USER ALREADY EXISTS
    // -----------------------------
    if (user) {
      user.role = "volunteer";
      user.volunteerRef = volunteer._id;

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

      // 🔥 SYSTEM PASSWORD
      user.password = hashedPassword;
      user.tempPassword = true;

      user.emailVerified = volunteer.isEmailVerified === true;
      user.phoneVerified = volunteer.isPhoneVerified === true;

      await user.save();
    }

    // -----------------------------
    // CASE 2: USER DOES NOT EXIST
    // -----------------------------
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

        emailVerified: volunteer.isEmailVerified === true,
        phoneVerified: volunteer.isPhoneVerified === true,

        tempPassword: true
      });
    }

    // 🔗 back-link volunteer → user
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