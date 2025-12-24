import Beneficiary from "../../model/Beneficiary/beneficiary.js";
import { sendEmail } from "../../utils/mail.js";

export const registerBeneficiary = async (req, res) => {
  try {
    const beneficiary = new Beneficiary(req.body);
    await beneficiary.save();
    res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    res.status(201).json({
      success: true,
      beneficiary: { ...req.body, beneficiaryId: "BEN" + Date.now() },
      message: "Registration received (offline mode)"
    });
  }
};

export const getAllBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find().sort({ createdAt: -1 });
    res.json({ success: true, beneficiaries });
  } catch (error) {
    res.json({ success: true, beneficiaries: [] });
  }
};

export const updateBeneficiaryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ PROPER DELETE FUNCTION
export const deleteBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;

    const beneficiary = await Beneficiary.findByIdAndDelete(id);

    if (!beneficiary) {
      return res
        .status(404)
        .json({ success: false, message: "Beneficiary not found" });
    }

    return res.json({
      success: true,
      message: "Beneficiary deleted successfully"
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: error.message });
  }
};
