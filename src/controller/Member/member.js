import Member from "../../model/Member/member.js";
import Notification from "../../model/Notification/notification.js";
import { sendEmail } from "../../utils/mail.js";
import bcrypt from "bcrypt";
//HELPERS
function normalizeBody(raw) {
  const body = { ...raw };

  if (!body.contactNumber && body.phoneNumber)
    body.contactNumber = body.phoneNumber;

  if (!body.pinCode && body.pincode) body.pinCode = body.pincode;

  if (body.typesOfSupport && typeof body.typesOfSupport === "string") {
    body.typesOfSupport = body.typesOfSupport
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (body.age) {
    const n = Number(body.age);
    body.age = Number.isFinite(n) ? n : body.age;
  }

  return body;
}

//REGISTER
export const registerMember = async (req, res) => {
  try {
    const body = normalizeBody(req.body);

    const required = [
      "fullName",
      "gender",
      "age",
      "contactNumber",
      "email",
      "address",
    ];

    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    //  PREVENT DUPLICATE REGISTRATION
    const exists = await Member.findOne({ email: body.email });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Member with this email already exists",
      });
    }

    const member = await Member.create({
      fullName: body.fullName,
      gender: body.gender,
      age: Number(body.age),
      contactNumber: body.contactNumber,
      email: body.email,
      address: body.address,
      area: body.area || "",
      state: body.state || "",
      pinCode: body.pinCode || "",
      typesOfSupport: body.typesOfSupport || [],
      specialRequirement: body.specialRequirement || "",
      status: "pending",
    });

    // 🔔 SAVE & SEND NOTIFICATION (Updated Logic)
    try {
      // 1. Database mein save karo
      const newNotification = await Notification.create({
        userType: "admin",
        title: "New Member Registration",
        message: `New Member registered: ${member.fullName}`,
        type: "registration",
        read: false,
      });

      // 2. Real-time Admin ko bhejo
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("admin-notification", newNotification);
      }
    } catch (notifyErr) {
      console.error("Notification Error:", notifyErr.message);
    }

    try {
      await sendEmail(
        member.email,
        "Membership Application Received",
        `Thank you ${member.fullName}. Your ID: ${member.memberId}`
      );
    } catch (e) {
      // ignore mail failure
    }

    return res.status(201).json({
      success: true,
      member,
    });
  } catch (err) {
    console.error("registerMember ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* APPROVE  */
export const approveMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findById(id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    if (member.status === "approved") {
      return res.json({ success: true, member });
    }

    member.status = "approved";
    member.approvedAt = new Date();
    await member.save();

    try {
      await sendEmail(
        member.email,
        "Membership Approved",
        "Your membership has been approved."
      );
    } catch (e) {}

    res.json({ success: true, member });
  } catch (err) {
    console.error("approveMember ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* GET ALL*/
export const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, members: [] });
  }
};

export const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }
    if (status === "rejected" && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    //  Update status in DB
    // const member = await Member.findByIdAndUpdate(
    //   id,
    //   {
    //     status,
    //     reviewedAt: new Date()
    //   },
    //   { new: true }
    // );
    const updateData = {
      status,
      reviewedAt: new Date(),
    };

    if (status === "rejected") {
      updateData.rejectionReason = reason;
    }
    const member = await Member.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    //  Prepare mail
    const subject =
      status === "approved"
        ? "🎉 Your Membership Application is Approved"
        : "❌ Your Membership Application is Rejected";

    const message =
      status === "approved"
        ? `
Hello ${member.fullName},

We are happy to inform you that your membership application has been APPROVED 🎉

Member ID: ${member.memberId}

Welcome to Orbosis Foundation.
`
        : `
Hello ${member.fullName},

Your membership application has been REJECTED.

Reason:
${reason}

If you believe this is a mistake, you may contact our support team.
`;

    // 3️⃣ Send mail (best-effort)
    let mailStatus = "sent";

    try {
      await sendEmail(member.email, subject, message);
    } catch (mailErr) {
      console.error("MAIL FAILED:", mailErr.message);
      mailStatus = "failed";
    }

    // 4️⃣ Final response
    return res.json({
      success: true,
      member,
      mailStatus,
      message:
        mailStatus === "sent"
          ? `Member ${status} & mail sent`
          : `Member ${status} but mail failed`,
    });
  } catch (err) {
    console.error("updateMemberStatus ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findById(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.json({
      success: true,
      member,
    });
  } catch (err) {
    console.error("getMemberById ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
