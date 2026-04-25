"use strict";

const db = require("../models");
const { AUDIT_STATUSES } = require("../constants/businessConstants");

const { AuditLog, User } = db;

class AuditLogService {
  buildRequestContext(req) {
    if (!req) return {};

    return {
      actorUserId: req.user?.userId || null,
      actorRole: req.user?.role || (Array.isArray(req.userRoles) ? req.userRoles[0] : null),
      requestId: req.headers?.["x-request-id"] || null,
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.headers?.["user-agent"] || null,
    };
  }

  async log(entry = {}, options = {}) {
    try {
      const payload = {
        actorUserId: entry.actorUserId || null,
        actorRole: entry.actorRole || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId !== undefined && entry.entityId !== null ? String(entry.entityId) : null,
        status: entry.status || AUDIT_STATUSES.SUCCESS,
        reason: entry.reason || null,
        metadata: entry.metadata || null,
        requestId: entry.requestId || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      };

      if (!payload.action || !payload.entityType) {
        return { success: false, message: "action and entityType are required" };
      }

      const auditLog = await AuditLog.create(payload, {
        transaction: options.transaction,
      });

      return { success: true, auditLog };
    } catch (error) {
      console.error("Audit log write failed:", error);
      return { success: false, message: "Failed to write audit log", error: error.message };
    }
  }

  async list(filters = {}, pagination = {}) {
    try {
      const {
        actorUserId,
        action,
        entityType,
        entityId,
        status,
        from,
        to,
      } = filters;
      const { page = 1, limit = 20 } = pagination;
      const where = {};

      if (actorUserId) where.actorUserId = actorUserId;
      if (action) where.action = action;
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = String(entityId);
      if (status) where.status = status;

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt[db.Sequelize.Op.gte] = new Date(from);
        if (to) where.createdAt[db.Sequelize.Op.lte] = new Date(to);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: "actor",
            attributes: ["userId", "username", "email", "firstName", "lastName"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      return {
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      };
    } catch (error) {
      console.error("List audit logs error:", error);
      return { success: false, message: "Failed to retrieve audit logs", error: error.message };
    }
  }
}

module.exports = new AuditLogService();
