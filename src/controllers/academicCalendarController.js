"use strict";

const academicCalendarService = require("../services/academicCalendarService");
const {
  emitAcademicYearEvent,
  emitAcademicBlockEvent,
} = require("../websocket/emitters");

class AcademicCalendarController {
  async createAcademicYear(req, res) {
    const result = await academicCalendarService.createAcademicYear(req.body);
    if (result.success) {
      emitAcademicYearEvent("created", {
        actorUserId: req.user?.userId || null,
        academicYearId: result.academicYear?.academicYearId,
        academicYear: result.academicYear,
      });
    }
    return res.status(result.success ? 201 : 400).json(result);
  }

  async listAcademicYears(req, res) {
    const result = await academicCalendarService.listAcademicYears(req.query);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async updateAcademicYear(req, res) {
    const result = await academicCalendarService.updateAcademicYear(parseInt(req.params.academicYearId), req.body);
    if (result.success) {
      emitAcademicYearEvent("updated", {
        actorUserId: req.user?.userId || null,
        academicYearId: parseInt(req.params.academicYearId),
        academicYear: result.academicYear,
      });
    }
    return res.status(result.success ? 200 : 400).json(result);
  }

  async deleteAcademicYear(req, res) {
    const result = await academicCalendarService.deleteAcademicYear(parseInt(req.params.academicYearId));
    if (result.success) {
      emitAcademicYearEvent("deleted", {
        actorUserId: req.user?.userId || null,
        academicYearId: parseInt(req.params.academicYearId),
      });
    }
    return res.status(result.success ? 200 : 400).json(result);
  }

  async createAcademicBlock(req, res) {
    const result = await academicCalendarService.createAcademicBlock(req.body);
    if (result.success) {
      emitAcademicBlockEvent("created", {
        actorUserId: req.user?.userId || null,
        academicBlockId: result.academicBlock?.academicBlockId,
        academicBlock: result.academicBlock,
      });
    }
    return res.status(result.success ? 201 : 400).json(result);
  }

  async createAcademicBlocksBulk(req, res) {
    const result = await academicCalendarService.createAcademicBlocksBulk(req.body);
    if (result.success) {
      emitAcademicBlockEvent("bulk-created", {
        actorUserId: req.user?.userId || null,
        academicYearId: req.body?.academicYearId,
        term: req.body?.term,
        blocks: result.data || [],
      });
    }
    return res.status(result.success ? 201 : 400).json(result);
  }

  async listAcademicBlocks(req, res) {
    const result = await academicCalendarService.listAcademicBlocks(req.query);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getCurrentAcademicBlock(req, res) {
    const result = await academicCalendarService.getCurrentAcademicBlock(req.query.date);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async updateAcademicBlock(req, res) {
    const result = await academicCalendarService.updateAcademicBlock(parseInt(req.params.academicBlockId), req.body);
    if (result.success) {
      emitAcademicBlockEvent("updated", {
        actorUserId: req.user?.userId || null,
        academicBlockId: parseInt(req.params.academicBlockId),
        academicBlock: result.academicBlock,
      });
    }
    return res.status(result.success ? 200 : 400).json(result);
  }

  async deleteAcademicBlock(req, res) {
    const result = await academicCalendarService.deleteAcademicBlock(parseInt(req.params.academicBlockId));
    if (result.success) {
      emitAcademicBlockEvent("deleted", {
        actorUserId: req.user?.userId || null,
        academicBlockId: parseInt(req.params.academicBlockId),
      });
    }
    return res.status(result.success ? 200 : 400).json(result);
  }
}

module.exports = new AcademicCalendarController();
