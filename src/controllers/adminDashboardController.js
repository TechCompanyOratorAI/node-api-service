"use strict";

const adminDashboardService = require("../services/adminDashboardService");

class AdminDashboardController {
  /**
   * GET /api/v1/admin/dashboard
   * Lấy tổng hợp metrics toàn hệ thống cho admin dashboard
   */
  async getDashboard(req, res) {
    try {
      const result = await adminDashboardService.getDashboardMetrics();

      if (result.success) {
        return res.status(200).json(result);
      }

      return res.status(500).json(result);
    } catch (error) {
      console.error("AdminDashboardController error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy dashboard metrics",
      });
    }
  }
}

module.exports = new AdminDashboardController();
