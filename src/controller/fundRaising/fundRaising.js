// import fundraising from "../../model/fundraising/fundraising.js";
import fundraising from "../../model/fundraising/fundraising.js";
import { uploadToCloudinary } from "../../utils/uploader.js";
export const getallFund = async (req, resp) => {
  try {
    const data = await fundraising.find()
    if (!data || data.length == 0) {
      resp.status(201).json({
        success: false,
        message: "No fund rising data found"
      })
    }
    resp.json({
      success: true,
      total: data.length,
      data,
    })
  } catch (error) {
    console.error("GET ERROR:", error);
    resp.status(500).json({
      success: false,
      message: "server error"
    })
  }

}

export const createFund = async (req, resp) => {
  try {
    const { name, city, payment, description, limit, campaignId, campaignType, shortDescription } = req.body;

    if (!req.file) return resp.status(400).json({ success: false, message: "Image is required" });
    const imageUrl = await uploadToCloudinary(req.file, "fundraising");

    // Naye Model ke hisaab se mapping
    const fund = await fundraising.create({
      campaignId: campaignId || new mongoose.Types.ObjectId(), // Campaign ID zaroori hai
      campaignTitle: name,       // 'name' ko 'campaignTitle' mein daalein
      city,
      raisedAmount: Number(payment) || 0, // 'payment' ko 'raisedAmount' mein
      targetAmount: Number(limit) || 0,   // 'limit' ko 'targetAmount' mein
      beneficiaryPhoto: imageUrl,        // 'image' ko 'beneficiaryPhoto' mein
      detailedStory: description,        // 'description' ko 'detailedStory' mein
      shortDescription: shortDescription || description.substring(0, 100),
      campaignType: campaignType || "General",
      status: "active"
    });

    return resp.status(201).json({ success: true, message: "Fund created successfully", data: fund });
  } catch (error) {
    console.error("CREATE ERROR :", error);
    return resp.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateFund = async (req, resp) => {
  try {
    const fund = await fundraising.findById(req.params.id);
    if (!fund) return resp.status(404).json({ success: false, message: "Fund not found" });

    let imageUrl = fund.beneficiaryPhoto; 
    if (req.file) {
      const uploadedUrl = await uploadToCloudinary(req.file, "fundraising");
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const updatedFund = await fundraising.findByIdAndUpdate(
      req.params.id,
      {
        campaignTitle: req.body.name || fund.campaignTitle,
        city: req.body.city || fund.city,
        raisedAmount: req.body.payment !== undefined ? Number(req.body.payment) : fund.raisedAmount,
        targetAmount: req.body.limit !== undefined ? Number(req.body.limit) : fund.targetAmount,
        detailedStory: req.body.description || fund.detailedStory,
        beneficiaryPhoto: imageUrl,
      },
      { new: true }
    );

    return resp.json({ success: true, message: "Fund updated successfully", data: updatedFund });
  } catch (error) {
    console.error("BACKEND UPDATE ERROR:", error);
    return resp.status(500).json({ success: false, message: "Server error" });
  }
};
export const deleteFund = async (req, resp) => {
  try {
    const fund = await fundraising.findById(req.params.id);
    if (!fund) {
      return resp.status(404).json({ success: false, message: "Fund not found" });
    }
    
    await fund.deleteOne();
    resp.json({ success: true, message: "Fund deleted successfully" });
  } catch (error) {
    console.error("DELETE ERROR", error);
    resp.status(500).json({ success: false, message: 'Server error' });
  }
};