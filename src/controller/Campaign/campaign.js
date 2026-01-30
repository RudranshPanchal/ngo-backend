import Campaign from "../../model/Campaign/campaign.js";
import Fundraising from "../../model/fundraising/fundraising.js";
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
