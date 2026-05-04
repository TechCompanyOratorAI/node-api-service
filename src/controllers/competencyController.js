"use strict";

const competencyService = require("../services/competencyService");
const db = require("../models");
const {
  emitCompetencyCatalogEvent,
  emitInstructorCompetencyEvent,
} = require("../websocket/emitters");

class CompetencyController {
  async listCompetencies(req, res) {
    const filters = { ...req.query };
    const actorRoles = req.userRoles || [];
    const isPrivileged = actorRoles.includes("Admin") || actorRoles.includes("AcademicCoordinator");

    if (!isPrivileged && actorRoles.includes("Instructor")) {
      const user = await db.User.findByPk(req.user.userId, {
        attributes: ["departmentId"],
      });
      if (user?.departmentId) {
        filters.departmentId = user.departmentId;
      }
    }

    const result = await competencyService.listCompetencies(filters);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async createCompetency(req, res) {
    const result = await competencyService.createCompetency(req.body, req.user.userId);
    if (result.success) {
      emitCompetencyCatalogEvent("created", {
        actorUserId: req.user?.userId || null,
        competencyId: result.competency?.competencyId,
        competency: result.competency,
      });
    }
    return res.status(result.success ? 201 : 400).json(result);
  }

  async declareInstructorCompetencies(req, res) {
    const actorId = req.user.userId;
    const instructorId = parseInt(req.params.id, 10);
    const actorRoles = req.userRoles || [];
    const canManageOthers = actorRoles.includes("Admin") || actorRoles.includes("AcademicCoordinator");
    if (!canManageOthers && actorId !== instructorId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền khai báo năng lực cho giảng viên này",
      });
    }

    const result = await competencyService.declareInstructorCompetencies(instructorId, req.body, actorId);
    if (result.success) {
      const items = Array.isArray(result.data) ? result.data : [];
      for (const item of items) {
        await emitInstructorCompetencyEvent("submitted", {
          actorUserId: actorId,
          instructorId,
          instructorCompetencyId: item.instructorCompetencyId,
          competencyId: item.competencyId,
          status: item.status,
          data: item,
        });
      }
    }
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getInstructorCompetencies(req, res) {
    const actorId = req.user.userId;
    const instructorId = parseInt(req.params.id, 10);
    const actorRoles = req.userRoles || [];
    const canManageOthers = actorRoles.includes("Admin") || actorRoles.includes("AcademicCoordinator");
    if (!canManageOthers && actorId !== instructorId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem năng lực của giảng viên này",
      });
    }

    const result = await competencyService.getInstructorCompetencies(instructorId);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async approveInstructorCompetency(req, res) {
    const result = await competencyService.approveInstructorCompetency(
      parseInt(req.params.id, 10),
      req.body,
      req.user.userId
    );
    if (result.success) {
      await emitInstructorCompetencyEvent("reviewed", {
        actorUserId: req.user?.userId || null,
        instructorCompetencyId: result.data?.instructorCompetencyId,
        instructorId: result.data?.instructorId,
        competencyId: result.data?.competencyId,
        status: result.data?.status,
        rejectionReason: result.data?.rejectionReason || null,
        data: result.data,
      });
    }
    return res.status(result.success ? 200 : 400).json(result);
  }

  async deleteInstructorCompetency(req, res) {
    const instructorCompetencyId = parseInt(req.params.id, 10);
    const existing = await db.InstructorCompetency.findByPk(instructorCompetencyId, {
      attributes: ["instructorCompetencyId", "instructorId", "competencyId", "status"],
    });
    const result = await competencyService.deleteInstructorCompetency(
      instructorCompetencyId,
      req.user.userId
    );
    if (result.success && existing) {
      await emitInstructorCompetencyEvent("deleted", {
        actorUserId: req.user?.userId || null,
        instructorCompetencyId: existing.instructorCompetencyId,
        instructorId: existing.instructorId,
        competencyId: existing.competencyId,
        status: existing.status,
      });
    }
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getEligibleInstructors(req, res) {
    const result = await competencyService.getEligibleInstructors(req.params.courseId, req.query);
    return res.status(result.success ? 200 : 400).json(result);
  }
}

module.exports = new CompetencyController();
