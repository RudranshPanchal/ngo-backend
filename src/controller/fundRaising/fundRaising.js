// import fundraising from "../../model/fundraising/fundraising.js";
import fundraising from "../../model/fundraising/fundraising.js";
import Campaign from "../../model/Campaign/campaign.js";
import mongoose from "mongoose";
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
    const { 
      name, campaignTitle, // Handle both keys
      city, 
      payment, raisedAmount, // Handle both keys
      description, detailedStory, // Handle both keys
      limit, targetAmount, // Handle both keys
      campaignType, shortDescription, beneficiaryName, 
      beneficiaryGender, mobile, state, minDonation, endDate 
    } = req.body;

    if (!req.user) return resp.status(401).json({ success: false, message: "Unauthorized" });

    // File handling logic
    let imageUrl = "";
    let docUrl = "";
    if (req.files) {
      // Check for 'image' OR 'beneficiaryPhoto'
      const imgFile = req.files.image ? req.files.image[0] : (req.files.beneficiaryPhoto ? req.files.beneficiaryPhoto[0] : null);
      if (imgFile) imageUrl = await uploadToCloudinary(imgFile, "fundraising/photos");
      
      if (req.files.documents) docUrl = await uploadToCloudinary(req.files.documents[0], "fundraising/docs");
    }

    const fund = await fundraising.create({
      campaignId: new mongoose.Types.ObjectId(),
      userId: req.user.id || req.user._id,
      fullName: req.user.fullName || req.user.name || "Admin",
      email: req.user.email,
      role: req.user.role || "admin",
      campaignTitle: campaignTitle || name,
      campaignType: campaignType || "General",
      shortDescription: shortDescription,
      detailedStory: detailedStory || description,
      beneficiaryName: beneficiaryName,
      beneficiaryGender: beneficiaryGender,
      mobile: mobile,
      city: city,
      state: state,
      targetAmount: Number(targetAmount || limit) || 0,
      raisedAmount: Number(raisedAmount || payment) || 0,
      minDonation: Number(minDonation) || 0,
      startDate: new Date(), // <--- YE RAHA START DATE (Current Date)
      endDate: endDate ? new Date(endDate) : null, // Frontend se aayi hui date
      beneficiaryPhoto: imageUrl,
      documents: docUrl,
      status: "active"
    });

    return resp.status(201).json({ success: true, data: fund });
  } catch (error) {
    console.error("DB Save Error:", error);
    return resp.status(500).json({ success: false, message: error.message });
  }
};
export const closeFund = async (req, res) => {
  try {
    const { id } = req.params;
    
    const fund = await fundraising.findByIdAndUpdate(
      id,
      { status: "closed" }, // Status change kar diya
      { new: true }
    );

    if (!fund) return res.status(404).json({ success: false, message: "Fund not found" });

    res.json({ success: true, message: "Campaign closed successfully", data: fund });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error while closing fund" });
  }
};

export const updateFund = async (req, resp) => {
  try {
    const fund = await fundraising.findById(req.params.id);
    if (!fund) return resp.status(404).json({ success: false, message: "Fund not found" });

    // Destructure body to handle both naming conventions
    const { 
      name, campaignTitle,
      city, 
      payment, raisedAmount,
      description, detailedStory,
      limit, targetAmount,
      status,
      // ... other fields
    } = req.body;

    let imageUrl = fund.beneficiaryPhoto; 
    
    // Handle file update (check both req.files and req.file)
    if (req.files) {
       const imgFile = req.files.image ? req.files.image[0] : (req.files.beneficiaryPhoto ? req.files.beneficiaryPhoto[0] : null);
       if (imgFile) {
         const uploadedUrl = await uploadToCloudinary(imgFile, "fundraising");
         if (uploadedUrl) imageUrl = uploadedUrl;
       }
    }

    const updatedFund = await fundraising.findByIdAndUpdate(
      req.params.id,
      {
        campaignTitle: campaignTitle || name || fund.campaignTitle,
        city: city || fund.city,
        raisedAmount: (raisedAmount !== undefined ? Number(raisedAmount) : (payment !== undefined ? Number(payment) : fund.raisedAmount)),
        targetAmount: (targetAmount !== undefined ? Number(targetAmount) : (limit !== undefined ? Number(limit) : fund.targetAmount)),
        detailedStory: detailedStory || description || fund.detailedStory,
        shortDescription: req.body.shortDescription || fund.shortDescription,
        beneficiaryName: req.body.beneficiaryName || fund.beneficiaryName,
        mobile: req.body.mobile || fund.mobile,
        state: req.body.state || fund.state,
        minDonation: req.body.minDonation !== undefined ? Number(req.body.minDonation) : fund.minDonation,
        endDate: req.body.endDate ? new Date(req.body.endDate) : fund.endDate,
        beneficiaryPhoto: imageUrl,
        status: status || fund.status,
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
// Naya function: Sirf login user ke campaigns laane ke liye
// export const getMyCampaigns = async (req, res) => {
//   try {
//     // 1. Check karo ki middleware ne user attach kiya ya nahi
//     if (!req.user) {
//       return res.status(401).json({ success: false, message: "No user found in request" });
//     }

//     // 2. ID nikaalne ke alag-alag tareeke check karo (JWT payload ke hisaab se)
//     const currentUserId = req.user.id || req.user._id || req.user.userId;

//     if (!currentUserId) {
//       console.log("Error: User ID is still undefined. Full req.user:", req.user);
//       return res.status(400).json({ success: false, message: "User ID not found in token" });
//     }

//     console.log("Fetching campaigns for User ID:", currentUserId);

//     // 3. Database query (Ab ye sirf isi ID ka data layega)
//     const campaigns = await fundraising.find({ userId: currentUserId }).sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       total: campaigns.length,
//       data: campaigns,
//     });
//   } catch (err) {
//     console.error("Fetch My Campaigns Error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
export const getMyCampaigns = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No user found" });
    }

    const currentUserId = req.user.id || req.user._id || req.user.userId;

    // Strict Filter: Sirf is userId ka data Fundraising collection se layein
    // Isme 'active' aur 'closed' dono status ka data aa jayega
    const campaigns = await fundraising.find({ userId: currentUserId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: campaigns.length,
      data: campaigns, // Frontend par aap 'status' field check karke UI change kar sakte hain
    });
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};