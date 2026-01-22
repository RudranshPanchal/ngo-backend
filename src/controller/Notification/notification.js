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
  await Notification.updateMany(
    { userType: "admin", read: false },
    { $set: { read: true } },
  );

  res.json({ success: true });
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
      userId: { $in: targetIds },
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
      { $set: { read: true } }
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

    await Notification.findByIdAndUpdate(id, { read: true });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" 
  };
    
    
export const getVolunteerNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userType: "volunteer",
      userId: req.user._id, // Only get notifications for this specific volunteer
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markVolunteerNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userType: "volunteer", userId: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
