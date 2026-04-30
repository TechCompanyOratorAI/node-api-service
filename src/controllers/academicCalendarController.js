"use strict";

const academicCalendarService = require("../services/academicCalendarService");

class AcademicCalendarController {
  async createAcademicYear(req, res) {
    const result = await academicCalendarService.createAcademicYear(req.body);
    return res.status(result.success ? 201 : 400).json(result);
  }

  async listAcademicYears(req, res) {
    const result = await academicCalendarService.listAcademicYears(req.query);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async updateAcademicYear(req, res) {
    const result = await academicCalendarService.updateAcademicYear(parseInt(req.params.academicYearId), req.body);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async deleteAcademicYear(req, res) {
    const result = await academicCalendarService.deleteAcademicYear(parseInt(req.params.academicYearId));
    return res.status(result.success ? 200 : 400).json(result);
  }

  async createAcademicBlock(req, res) {
    const result = await academicCalendarService.createAcademicBlock(req.body);
    return res.status(result.success ? 201 : 400).json(result);
  }

  async createAcademicBlocksBulk(req, res) {
    const result = await academicCalendarService.createAcademicBlocksBulk(req.body);
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
    return res.status(result.success ? 200 : 400).json(result);
  }

  async deleteAcademicBlock(req, res) {
    const result = await academicCalendarService.deleteAcademicBlock(parseInt(req.params.academicBlockId));
    return res.status(result.success ? 200 : 400).json(result);
  }
}

module.exports = new AcademicCalendarController();
