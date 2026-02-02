import Notification from "../../model/Notification/notification.js";
import User from "../../model/Auth/auth.js";
import Member from "../../model/Member/member.js";

export const getAdminNotifications = async (req, res) => {
  const notifications = await Notification.find({
    userType: "admin",
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    notifications,
  });
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userType: "admin", read: false },
      { $set: { read: true } },
    );
    res
      .status(200)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllAsRead Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get member notifications
export const getMemberNotifications = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware

    // 1. Get User details to find email
    const user = await User.findById(userId);

    // 2. Find associated Member profile using email
    const member = user ? await Member.findOne({ email: user.email }) : null;

    // 3. Search for notifications on BOTH User ID and Member ID
    const targetIds = [userId];
    if (member) {
      targetIds.push(member._id);
    }

    const notifications = await Notification.find({
      userType: "member",
      $or: [
        { userId: { $in: targetIds } },
        { userId: null }, // Fetch broadcast notifications for members
      ],
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    console.error("Get member notifications error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark all member notifications as read
export const markMemberNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const member = user ? await Member.findOne({ email: user.email }) : null;

    const targetIds = [userId];
    if (member) targetIds.push(member._id);

    await Notification.updateMany(
      { userType: "member", userId: { $in: targetIds }, read: false },
      { $set: { read: true } },
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Mark all member notifications read error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark member notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { read: true } },
      { new: true },
    );

    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get volunteer notifications
export const getVolunteerNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userType: "volunteer",
      $or: [
        { userId: req.user._id },
        { userId: null }, // Fetch broadcast notifications for volunteers
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark volunteer notifications as read
export const markVolunteerNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userType: "volunteer", userId: req.user._id, read: false },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get donor notifications
export const getDonorNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userType: "donor",
      $or: [
        { userId: req.user._id },
        { userId: null }, // Fetch broadcast notifications for donors
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark donor notifications as read
export const markDonorNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userType: "donor", userId: req.user._id, read: false },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get generic user notifications (Fundraiser, etc.)
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark generic user notifications as read
export const markUserNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
