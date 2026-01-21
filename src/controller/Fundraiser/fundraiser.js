import Fundraiser from "../../model/Fundraiser/Fundraiser.js";
import bcrypt from "bcryptjs";

export const applyForFundraiser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
      password,
      campaignTitle,
      campaignType,
      shortDescription,
      detailedStory,
      beneficiaryName,
      beneficiaryGender,
      city,
      state,
      targetAmount,
      minDonation,
      startDate,
      endDate,
    } = req.body;

    // Check duplicate email
    const exists = await Fundraiser.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already used" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const fundraiser = await Fundraiser.create({
      fullName,
      email,
      mobile,
      password: hashedPassword,
      campaignTitle,
      campaignType,
      shortDescription,
      detailedStory,
      beneficiaryName,
      beneficiaryGender,
      city,
      state,
      targetAmount,
      minDonation,
      startDate,
      endDate,
      status: "PENDING", // Default status
      beneficiaryPhoto: req.files?.beneficiaryPhoto?.[0]?.path,
      documents: req.files?.documents?.[0]?.path,
    });

    res.status(201).json({
      success: true,
      message: "Fundraiser request submitted for admin approval",
      data: fundraiser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminFundraisers = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    // Filter by status if provided and not 'ALL'
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const fundraisers = await Fundraiser.find(query).sort({ createdAt: -1 });
    res.status(200).json(fundraisers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateFundraiserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    const fundraiser = await Fundraiser.findByIdAndUpdate(
      id,
      { status, adminRemark },
      { new: true }
    );

    if (!fundraiser) return res.status(404).json({ message: "Fundraiser not found" });

    res.status(200).json({ success: true, message: "Status updated", data: fundraiser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};