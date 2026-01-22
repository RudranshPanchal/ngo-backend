// // import Notification from "../../model/Notification/notification.js";

// // /**
// //  * ADMIN – GET ALL NOTIFICATIONS
// //  */
// // export const getAdminNotifications = async (req, res) => {
// //   try {
// //     const notifications = await Notification.find({ userType: "admin" })
// //       .sort({ createdAt: -1 })
// //       .limit(20);

// //     res.json({ success: true, notifications });
// //   } catch (err) {
// //     res.status(500).json({ success: false, message: "Server error" });
// //   }
// // };

// // /**
// //  * MARK ALL AS READ
// //  */
// // export const markAllAsRead = async (req, res) => {
// //   try {
// //     await Notification.updateMany(
// //       { userType: "admin", read: false },
// //       { read: true }
// //     );
// //     res.json({ success: true });
// //   } catch (err) {
// //     res.status(500).json({ success: false });
// //   }
// // };
// import Notification from "../../model/Notification/notification.js";

// export const getAdminNotifications = async (req, res) => {
//   const notifications = await Notification.find({
//     userType: "admin"
//   }).sort({ createdAt: -1 });

//   res.json({
//     success: true,
//     notifications
//   });
// };


// export const markAllAsRead = async (req, res) => {
//   await Notification.updateMany(
//     { for: "admin", read: false },
//     { $set: { read: true } }
//   );

//   res.json({ success: true });
// };
import Notification from "../../model/Notification/notification.js";

export const getAdminNotifications = async (req, res) => {
  const notifications = await Notification.find({
    userType: "admin"
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    notifications,
  });
};

export const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { userType: "admin", read: false },
    { $set: { read: true } }
  );

  res.json({ success: true });
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
