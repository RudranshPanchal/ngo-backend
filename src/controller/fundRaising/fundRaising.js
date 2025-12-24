import fundraising from "../../model/fundraising/fundraising.js";

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
//create fund
export const createFund = async (req, resp) => {
  try {
    const { name, city, payment, description, tags, limit } = req.body;

    // FILE COMES HERE (ONLY IF FRONTEND SENDS FILE)
    const image = req.file ? req.file.path : null;

    // VALIDATION
    if (!name || !city || !payment || !image || !description || !tags || !limit) {
      return resp.status(400).json({
        success: false,
        message: "All fields including image are required",
      });
    }

    const fund = await fundraising.create({
      name,
      city,
      payment,
      limit,
      image,                               // ← IMAGE SAVED HERE
      description,
      tags: JSON.parse(tags),              // ← tags string → array
    });

    return resp.status(201).json({
      success: true,
      message: "Fund created successfully",
      data: fund,
    });
  } catch (error) {
    console.error("CREATE ERROR :", error);
    return resp.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


export const updateFund = async (req, resp) => {
  try {
    const fund = await fundraising.findById(req.params.id);

    if (!fund) {
      return resp.status(404).json({
        success: false,
        message: "Fund not found",
      });
    }

    // NEW IMAGE (optional)
    const image = req.file ? req.file.path : fund.image;

    const updatedFund = await fundraising.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        city: req.body.city,
        payment: req.body.payment,
        limit: req.body.limit,
        description: req.body.description,
        image,
        tags: req.body.tags ? JSON.parse(req.body.tags) : fund.tags,
      },
      { new: true }
    );

    return resp.json({
      success: true,
      message: "Fund updated successfully",
      data: updatedFund,
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    resp.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// delete 
export const deleteFund = async (req, resp) => {
  try {
    const fund = await fundraising.findById(req.params.id)

    if (!fund) {
      return resp.status(404).json({
        success: false,
        message: "Fund note found"
      })
    }
    await fund.deleteOne()
    resp.json({
      success: true,
      message: " Fund deleted successfully"
    });
  } catch (error) {
    console.error("DELETE ERROR", error);
    resp.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
}