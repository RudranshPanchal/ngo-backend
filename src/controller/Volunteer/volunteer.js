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



export const updateVolunteerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, password } = req.body;

    if (!id)
      return res.status(400).json({ success: false, error: "Missing id" });

    const volunteer = await Volunteer.findById(id);
    if (!volunteer)
      return res.status(404).json({ success: false, error: "Volunteer not found" });

    // update status
    volunteer.status = status;
    await volunteer.save();

    //  SOURCE OF TRUTH
    const emailVerified = volunteer.isEmailVerified === true;
    const phoneVerified = volunteer.isPhoneVerified === true;

    //  ALWAYS SYNC VERIFICATION (even if password not sent)
    await User.updateOne(
      { memberId: volunteer.volunteerId },
      {
        $set: {
          emailVerified,
          phoneVerified
        }
      }
    );

    // 👇 PASSWORD LOGIC ONLY WHEN PROVIDED
    if (status === "approved" && password) {
      const hashed = await bcrypt.hash(password, 10);

      await User.updateOne(
        { memberId: volunteer.volunteerId },
        {
          $set: {
            password: hashed,
            tempPassword: false
          }
        }
      );

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
    if (status === "rejected") {
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
