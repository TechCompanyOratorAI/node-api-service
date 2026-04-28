"use strict";

const competencyService = require("../services/competencyService");

class CompetencyController {
  async listCompetencies(req, res) {
    const result = await competencyService.listCompetencies(req.query);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async createCompetency(req, res) {
    const result = await competencyService.createCompetency(req.body, req.user.userId);
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
        message: "You can only submit competencies for your own instructor profile",
      });
    }

    const result = await competencyService.declareInstructorCompetencies(instructorId, req.body, actorId);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async approveInstructorCompetency(req, res) {
    const result = await competencyService.approveInstructorCompetency(
      parseInt(req.params.id, 10),
      req.body,
      req.user.userId
    );
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getEligibleInstructors(req, res) {
    const result = await competencyService.getEligibleInstructors(req.params.courseId, req.query);
    return res.status(result.success ? 200 : 400).json(result);
  }
}

module.exports = new CompetencyController();
