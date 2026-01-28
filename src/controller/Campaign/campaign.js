import Campaign from "../../model/Campaign/campaign.js";
import { sendEmail } from "../../utils/mail.js";

// CREATE CAMPAIGN
export const createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create({
      ...req.body,
      beneficiaryPhoto: req.files?.beneficiaryPhoto?.[0]?.path,
      documents: req.files?.documents?.[0]?.path,
    });

    res.status(201).json({
      success: true,
      message: "Campaign request submitted. Waiting for admin approval.",
      campaign,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found." });
    }

    campaign.status = status;

    if (status === "rejected") {
      if (!adminRemark) {
        return res
          .status(400)
          .json({ success: false, message: "Rejection reason is required." });
      }
      campaign.adminRemark = adminRemark;
    }

    await campaign.save();

    try {
      if (status === "rejected" && campaign.email) {
        await sendEmail({
          to: campaign.email,
          subject: `Update on your campaign "${campaign.campaignTitle}"`,
          html: `<p>Hi ${campaign.fullName},</p><p>We have reviewed your campaign request for "${campaign.campaignTitle}". Unfortunately, it has been rejected for the following reason:</p><p><strong>Reason:</strong> ${adminRemark}</p><p>Please make the necessary changes and you can apply again.</p><p>Regards,<br/>NGO Team</p>`,
        });
      } else if (status === "approved" && campaign.email) {
        await sendEmail({
          to: campaign.email,
          subject: `Congratulations! Your campaign "${campaign.campaignTitle}" is approved!`,
          html: `<p>Hi ${campaign.fullName},</p><p>We are happy to inform you that your campaign "<strong>${campaign.campaignTitle}</strong>" has been approved and is now live.</p><p>Thank you for your contribution!</p><p>Regards,<br/>NGO Team</p>`,
        });
      }
    } catch (emailErr) {
      console.error("Email sending failed but campaign status updated:", emailErr);
    }

    res.json({ success: true, message: `Campaign ${status} successfully.` });
  } catch (error) {
    console.error(`Error updating campaign status: ${error.message}`);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating status." });
  }
};

export const getApprovedCampaigns = async (req, res) => {
  const data = await Campaign.find({ status: "approved" });
  res.json(data);
};
