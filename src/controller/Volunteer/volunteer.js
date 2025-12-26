import Volunteer from "../../model/Volunteer/volunteer.js";
import { sendEmail, sendVolunteerApplicationReceivedEmail, sendVolunteerWelcomeEmail, sendVolunteerRejectionEmail } from "../../utils/mail.js";
import { getLocalFileUrl } from "../../utils/multer.js";
import bcrypt from "bcrypt";
import User from "../../model/Auth/auth.js";

// controller/Volunteer/volunteer.js

export const registerVolunteer = async (req, res) => {
    try {
        if (req.file) {
            req.body.uploadIdProof = getLocalFileUrl(req.file);
        }

        // Email check
        const existingVolunteer = await Volunteer.findOne({ email: req.body.email });
        if (existingVolunteer) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        // Front-end se 'isEmailVerified' aur 'isPhoneVerified' bhejein
        // Agar nahi aayenge toh default 'false' save hoga
        const volunteerData = {
            ...req.body,
            isEmailVerified: req.body.isEmailVerified === 'true' || req.body.isEmailVerified === true,
            isPhoneVerified: req.body.isPhoneVerified === 'true' || req.body.isPhoneVerified === true
        };

        const volunteer = new Volunteer(volunteerData);
        await volunteer.save();

        // Mail sending logic...
        try {
            await sendVolunteerApplicationReceivedEmail({
                toEmail: volunteer.email,
                fullName: volunteer.fullName,
            });
        } catch (e) { 
            console.log("Mail error:", e.message); 
        }

        res.status(201).json({ success: true, volunteer });

    } catch (error) {
        // ... error handling ...
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
//     try {
//         const { id } = req.params;
//         const { status, password } = req.body;

//         // console.log("\n--------- DEBUG: Incoming Request ---------");
//         // console.log("ID:", id);
//         // console.log("BODY:", req.body);
//         // console.log("STATUS:", status);
//         // console.log("PASSWORD:", password);
//         // console.log("-------------------------------------------\n");

//         if (!id)
//             return res.status(400).json({ success: false, error: "Missing id" });

//         // find volunteer
//         const volunteer = await Volunteer.findById(id);
//         console.log("FOUND VOLUNTEER:", volunteer ? volunteer.email : "NOT FOUND");

//         if (!volunteer)
//             return res.status(404).json({ success: false, error: "Volunteer not found" });

//         // update status
//         volunteer.status = status;
//         await volunteer.save();

//         // 💥 DEBUG if approved block will run or not
//         console.log("Should create user?", status === "approved" && password ? "YES" : "NO");


//         // If approved AND password provided -> create or update auth user
//         if (status === "approved" && password) {

//             console.log("🔵 ENTERING USER CREATION BLOCK");

//             // Always connect volunteer → user using volunteerId
//             let existingUser = await User.findOne({ memberId: volunteer.volunteerId });

//             const hashed = await bcrypt.hash(password, 10);

//             if (existingUser) {
//                 console.log("Updating existing volunteer user...");

//                 existingUser.fullName = volunteer.fullName;
//                 existingUser.password = hashed;
//                 existingUser.role = "volunteer";
//                 existingUser.memberId = volunteer.volunteerId;

//                 existingUser.contactNumber = volunteer.contactNumber || "";
//                 existingUser.address = volunteer.address || "";
//                 existingUser.gender = volunteer.gender || "";
//                 existingUser.dob = volunteer.dob || "";
//                 existingUser.areaOfVolunteering = volunteer.areaOfVolunteering;
//                 existingUser.availability = volunteer.availability;

//                 existingUser.skills = Array.isArray(volunteer.skills)
//                     ? volunteer.skills
//                     : (volunteer.skills || "").split(",").map(s => s.trim());

//                 existingUser.profession = volunteer.profession || "";
//                 existingUser.uploadIdProof = volunteer.uploadIdProof || "";

//                 existingUser.tempPassword = false;

//                 await existingUser.save();
//             }
//             else {
//                 console.log("Creating NEW volunteer user...");

//                 await User.create({
//                     fullName: volunteer.fullName,
//                     email: volunteer.email,
//                     password: hashed,
//                     role: "volunteer",
//                     memberId: volunteer.volunteerId,

//                     contactNumber: volunteer.contactNumber,
//                     address: volunteer.address,
//                     gender: volunteer.gender,
//                     dob: volunteer.dob,

//                     areaOfVolunteering: volunteer.areaOfVolunteering,
//                     availability: volunteer.availability,

//                     skills: Array.isArray(volunteer.skills)
//                         ? volunteer.skills
//                         : (volunteer.skills || "").split(",").map(s => s.trim()),

//                     profession: volunteer.profession,
//                     uploadIdProof: volunteer.uploadIdProof,
//                     tempPassword: true
//                 });
//             }

//             // Send email (no crash if mail fails)
//             try {
//                 await sendVolunteerWelcomeEmail({
//                     toEmail: volunteer.email,
//                     fullName: volunteer.fullName,
//                     email: volunteer.email,
//                     password,
//                     volunteerId: volunteer.volunteerId

//                 });
//                 console.log("📧 Welcome Email Sent");
//             } catch (err) {
//                 console.log("📧 Email Send Error:", err.message);
//             }
//         }

//         // rejection email
//         else if (status === "rejected") {
//             console.log("🔴 Volunteer Rejected - sending rejection email");
//             try {
//                 await sendVolunteerRejectionEmail({
//                     toEmail: volunteer.email,
//                     fullName: volunteer.fullName,
//                     volunteerId: volunteer.volunteerId
//                 });
//                 console.log("📧 Rejection Email Sent");
//             } catch (err) {
//                 console.log("📧 Rejection Email Error:", err.message);
//             }
//         }

//         console.log("✔ Update completed");

//         return res.json({ success: true, volunteer });

//     } catch (error) {
//         console.error("🔥 updateVolunteerStatus ERROR:", error.message);
//         return res.status(500).json({ success: false, error: error.message });
//     }
// };
export const updateVolunteerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, password } = req.body;

    if (!id)
      return res.status(400).json({ success: false, error: "Missing id" });

    // find volunteer
    const volunteer = await Volunteer.findById(id);
    if (!volunteer)
      return res.status(404).json({ success: false, error: "Volunteer not found" });

    // update status
    volunteer.status = status;
    await volunteer.save();

    // ✅ SOURCE OF TRUTH → volunteer
    const emailVerified = volunteer.isEmailVerified == true;
    const phoneVerified = volunteer.isPhoneVerified == true;

    // If approved AND password provided -> create or update auth user
    if (status === "approved" && password) {

      let existingUser = await User.findOne({ memberId: volunteer.volunteerId });
      const hashed = await bcrypt.hash(password, 10);

      if (existingUser) {
        // 🔄 UPDATE USER
        existingUser.fullName = volunteer.fullName;
        existingUser.password = hashed;
        existingUser.role = "volunteer";
        existingUser.memberId = volunteer.volunteerId;

        existingUser.contactNumber = volunteer.contactNumber || "";
        existingUser.address = volunteer.address || "";
        existingUser.gender = volunteer.gender || "";
        existingUser.dob = volunteer.dob || "";

        existingUser.areaOfVolunteering = volunteer.areaOfVolunteering;
        existingUser.availability = volunteer.availability;

        existingUser.skills = Array.isArray(volunteer.skills)
          ? volunteer.skills
          : (volunteer.skills || "").split(",").map(s => s.trim());

        existingUser.profession = volunteer.profession || "";
        existingUser.uploadIdProof = volunteer.uploadIdProof || "";

        // ✅ SYNC VERIFICATION FLAGS
        existingUser.emailVerified = emailVerified;
        existingUser.phoneVerified = phoneVerified;

        existingUser.tempPassword = false;

        await existingUser.save();
      } else {
        // 🆕 CREATE USER
        await User.create({
          fullName: volunteer.fullName,
          email: volunteer.email,
          password: hashed,
          role: "volunteer",
          memberId: volunteer.volunteerId,

          contactNumber: volunteer.contactNumber,
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

          // ✅ SYNC VERIFICATION FLAGS
          emailVerified: emailVerified,
          phoneVerified: phoneVerified,

          tempPassword: true
        });
      }

      // welcome email
      try {
        await sendVolunteerWelcomeEmail({
          toEmail: volunteer.email,
          fullName: volunteer.fullName,
          email: volunteer.email,
          password,
          volunteerId: volunteer.volunteerId
        });
      } catch (_) {}
    }

    // rejection mail
    else if (status === "rejected") {
      try {
        await sendVolunteerRejectionEmail({
          toEmail: volunteer.email,
          fullName: volunteer.fullName,
          volunteerId: volunteer.volunteerId
        });
      } catch (_) {}
    }

    return res.json({ success: true, volunteer });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
