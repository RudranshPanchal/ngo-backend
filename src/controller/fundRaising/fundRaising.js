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
    const { name, city, payment, description, tags, limit } = req.body;

    if (!req.file) {
      return resp.status(400).json({ success: false, message: "Image is required" });
    }

    const imageUrl = await uploadToCloudinary(req.file, "fundraising");

    if (!name || !city || !payment || !description || !tags || !limit) {
      return resp.status(400).json({ success: false, message: "All fields are required" });
    }

    let finalTags = [];
    try {
      finalTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    } catch (e) {
      finalTags = tags; 
    }

    const fund = await fundraising.create({
      name,
      city,
      payment,
      limit,
      image: imageUrl, 
      description,
      tags: finalTags,
    });

    return resp.status(201).json({
      success: true,
      message: "Fund created successfully",
      data: fund,
    });
  } catch (error) {
    console.error("CREATE ERROR :", error);
    return resp.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateFund = async (req, resp) => {
  try {
    const fund = await fundraising.findById(req.params.id);
    if (!fund) return resp.status(404).json({ success: false, message: "Fund not found" });

    let imageUrl = fund.image; 

    if (req.file) {
      const uploadedUrl = await uploadToCloudinary(req.file, "fundraising");
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    let finalTags = fund.tags;
    if (req.body.tags) {
      try {
        finalTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (e) {
        console.log("Tag parsing failed, using raw value");
        finalTags = req.body.tags;
      }
    }

    const updatedFund = await fundraising.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || fund.name,
        city: req.body.city || fund.city,
        payment: req.body.payment || fund.payment,
        limit: req.body.limit || fund.limit,
        description: req.body.description || fund.description,
        image: imageUrl,
        tags: finalTags,
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