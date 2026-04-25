import db from "../models/index.js";

const { Notification } = db;

const notificationController = {
  async getMyNotifications(req, res) {
    try {
      const userId = req.user.userId;
      const notifications = await Notification.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        limit: 50,
      });
      return res.json({ success: true, data: notifications });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async markAllRead(req, res) {
    try {
      const userId = req.user.userId;
      await Notification.update({ read: true }, { where: { userId, read: false } });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default notificationController;
