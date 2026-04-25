"use strict";

const auditLogService = require("../services/auditLogService");

class AuditLogController {
  async list(req, res) {
    try {
      const {
        actorUserId,
        action,
        entityType,
        entityId,
        status,
        from,
        to,
        page = 1,
        limit = 20,
      } = req.query;

      const result = await auditLogService.list(
        {
          actorUserId: actorUserId ? parseInt(actorUserId) : null,
          action,
          entityType,
          entityId,
          status,
          from,
          to,
        },
        { page, limit }
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Audit log list controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new AuditLogController();
