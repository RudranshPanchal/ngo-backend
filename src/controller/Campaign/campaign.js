import Campaign from "../../model/Campaign/campaign.js";
import Fundraising from "../../model/fundraising/fundraising.js";
import Notification from "../../model/Notification/notification.js";
import { sendEmail } from "../../utils/mail.js";
import { uploadToCloudinary } from "../../utils/uploader.js";

// CREATE CAMPAIGN
export const createCampaign = async (req, res) => {
  try {
    // 1. Check Authentication (req.user requireAuth middleware se aayega)
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication failed. Please login again." 
      });
    }

    const files = req.files;
    let beneficiaryPhotoUrl = "";
    let documentsUrl = "";

    // 2. Upload Beneficiary Photo to Cloudinary
    if (files?.beneficiaryPhoto?.[0]) {
      try {
        beneficiaryPhotoUrl = await uploadToCloudinary(files.beneficiaryPhoto[0], 'campaigns/photos');
      } catch (uploadError) {
        console.error('Error uploading beneficiary photo:', uploadError);
        return res.status(500).json({ success: false, message: 'Error uploading photo to Cloudinary' });
      }
    }

    // 3. Upload Documents to Cloudinary
    if (files?.documents?.[0]) {
      try {
        documentsUrl = await uploadToCloudinary(files.documents[0], 'campaigns/docs');
      } catch (uploadError) {
        console.error('Error uploading documents:', uploadError);
        return res.status(500).json({ success: false, message: 'Error uploading documents to Cloudinary' });
      }
    }

    // 4. Create Campaign in DB with userId
    const campaign = await Campaign.create({
      ...req.body,
      userId: req.user.id || req.user._id, // User ki unique ID save ho rahi hai
      role: req.user.role, // Explicitly save role from logged-in user
      beneficiaryPhoto: beneficiaryPhotoUrl,
      documents: documentsUrl,
      status: "pending" // Default status
    });

    // 🔔 NOTIFICATION LOGIC
    try {
      const newNotification = await Notification.create({
        userType: "admin",
        message: `New Campaign Request: ${req.body.campaignTitle || "Untitled"}`,
        type: "campaign-request",
        role: "fundraiser",
        read: false,
        relatedId: campaign._id
      });

      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("admin-notification", newNotification);
      }
    } catch (notifyErr) {
      console.error("Notification Error:", notifyErr);
    }

    res.status(201).json({
      success: true,
      message: "Campaign request submitted. Waiting for admin approval.",
      campaign,
    });

  } catch (err) {
    console.error("Campaign Creation Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Internal Server Error" 
    });
  }
};

export const getPendingCampaigns = async (req, res) => {
  const data = await Campaign.find({ status: "pending" });
  res.json(data);
};

export const updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // ---------------- APPROVE ----------------
    if (status === "approved") {
  campaign.status = "approved";
  await campaign.save();

  await Fundraising.create({
    campaignId: campaign._id,
userId: campaign.userId,
    role: campaign.role,
    fullName: campaign.fullName,
    email: campaign.email,
    mobile: campaign.mobile,

    campaignTitle: campaign.campaignTitle,
    campaignType: campaign.campaignType,

    shortDescription: campaign.shortDescription,
    detailedStory: campaign.detailedStory,

    beneficiaryName: campaign.beneficiaryName,
    beneficiaryGender: campaign.beneficiaryGender,

    city: campaign.city,
    state: campaign.state,

    targetAmount: campaign.targetAmount,
    minDonation: campaign.minDonation,

    startDate: campaign.startDate,
    endDate: campaign.endDate,

    beneficiaryPhoto: campaign.beneficiaryPhoto,
    documents: campaign.documents,
  });

  //  NOTIFICATION LOGIC (APPROVED)
  try {
    const newNotification = await Notification.create({
      userId: campaign.userId,
      message: `Your campaign "${campaign.campaignTitle}" has been approved!`,
      type: "campaign-approved",
      role: "fundraiser",
      read: false,
      relatedId: campaign._id
    });

    const io = req.app.get("io");
    if (io) {
      io.to(campaign.userId.toString()).emit("user-notification", newNotification);
      
      // 🔔 BROADCAST TO ALL USERS (Donors, Volunteers, Members)
      const broadcastMsg = {
        message: `New Campaign Alert: "${campaign.campaignTitle}" is now live!`,
        type: "campaign-live",
        read: false,
        createdAt: new Date(),
        redirectUrl: "/FundRaising"
      };
      io.emit("campaign-notification", broadcastMsg);
    }
  } catch (notifyErr) {
    console.error("Notification Error:", notifyErr);
  }

  return res.json({
    success: true,
    message: "Campaign approved & live on fundraising",
  });
}
    // ---------------- REJECT ----------------
    if (status === "rejected") {
      if (!adminRemark) {
        return res.status(400).json({ message: "Rejection reason required" });
      }

      campaign.status = "rejected";
      campaign.adminRemark = adminRemark;
      await campaign.save();

      // 🔔 NOTIFICATION LOGIC (REJECTED)
      try {
        const newNotification = await Notification.create({
          userId: campaign.userId,
          message: `Your campaign "${campaign.campaignTitle}" was rejected. Reason: ${adminRemark}`,
          type: "campaign-rejected",
          role: "fundraiser",
          read: false,
          relatedId: campaign._id
        });

        const io = req.app.get("io");
        if (io) {
          io.to(campaign.userId.toString()).emit("user-notification", newNotification);
        }
      } catch (notifyErr) {
        console.error("Notification Error:", notifyErr);
      }

      return res.json({
        success: true,
        message: "Campaign rejected",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


export const getApprovedCampaigns = async (req, res) => {
  const data = await Campaign.find({ status: "approved" });
  res.json(data);
};

// export const getMyCampaigns = async (req, res) => {
//   try {
//     const fundraiserEmail = req.user.email;

//     if (!fundraiserEmail) {
//       return res.status(401).json({ success: false, message: "Authentication error, user email not found." });
//     }

//     // 1. Fetch from Campaign collection (Applications) instead of Fundraising (Live)
//     // This ensures Pending and Rejected campaigns are also shown
//     const campaigns = await Campaign.find({ email: fundraiserEmail }).sort({ createdAt: -1 });

//     // 2. For approved campaigns, fetch current progress from Fundraising collection
//     const data = await Promise.all(campaigns.map(async (camp) => {
//       let raisedAmount = 0;
      
//       if (camp.status === 'approved') {
//         const fund = await Fundraising.findOne({ campaignId: camp._id });
//         if (fund) {
//           raisedAmount = fund.raisedAmount || 0;
//         }
//       }

//       return {
//         ...camp.toObject(),
//         raisedAmount
//       };
//     }));

//     res.status(200).json({
//       success: true,
//       data: data,
//     });
//   } catch (err) {
//     console.error("Fetch My Campaigns Error:", err);
//     res.status(500).json({ success: false, message: "Server error while fetching campaigns." });
//   }
// };
