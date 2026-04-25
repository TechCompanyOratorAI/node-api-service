"use strict";

const db = require("../models");
const {
  ACADEMIC_TERM_VALUES,
  ACADEMIC_HALF_VALUES,
  ACADEMIC_BLOCK_TYPES,
  ACADEMIC_BLOCK_TYPE_VALUES,
} = require("../constants/businessConstants");

const { AcademicYear, AcademicBlock } = db;
const { Op } = db.Sequelize;

const toDateOnly = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

class AcademicCalendarService {
  validateDateRange(startDate, endDate, label = "Date range") {
    if (!startDate || !endDate) {
      return `${label} requires startDate and endDate`;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return `${label} endDate must be after startDate`;
    }

    return null;
  }

  buildBlockCode(year, term, half, blockType) {
    return [year, term, blockType === ACADEMIC_BLOCK_TYPES.BLOCK3 ? "BLOCK3" : half]
      .filter(Boolean)
      .join("-");
  }

  async createAcademicYear(data) {
    try {
      const { year, name, startDate, endDate, isActive = true } = data;
      const rangeError = this.validateDateRange(startDate, endDate, "Academic year");
      if (rangeError) return { success: false, message: rangeError };

      const existing = await AcademicYear.findOne({ where: { year } });
      if (existing) {
        return { success: false, message: "Academic year already exists" };
      }

      const academicYear = await AcademicYear.create({
        year,
        name: name || String(year),
        startDate,
        endDate,
        isActive,
      });

      return { success: true, message: "Academic year created successfully", academicYear };
    } catch (error) {
      console.error("Create academic year error:", error);
      return { success: false, message: "Failed to create academic year", error: error.message };
    }
  }

  async listAcademicYears(filters = {}) {
    try {
      const where = {};
      if (filters.isActive !== undefined) where.isActive = filters.isActive === true || filters.isActive === "true";
      if (filters.year) where.year = filters.year;

      const academicYears = await AcademicYear.findAll({
        where,
        include: [
          {
            model: AcademicBlock,
            as: "blocks",
            required: false,
            order: [["startDate", "ASC"]],
          },
        ],
        order: [["year", "DESC"]],
      });

      return { success: true, data: academicYears };
    } catch (error) {
      console.error("List academic years error:", error);
      return { success: false, message: "Failed to retrieve academic years", error: error.message };
    }
  }

  async updateAcademicYear(academicYearId, data) {
    try {
      const academicYear = await AcademicYear.findByPk(academicYearId);
      if (!academicYear) return { success: false, message: "Academic year not found" };

      const startDate = data.startDate || academicYear.startDate;
      const endDate = data.endDate || academicYear.endDate;
      const rangeError = this.validateDateRange(startDate, endDate, "Academic year");
      if (rangeError) return { success: false, message: rangeError };

      await academicYear.update({
        year: data.year !== undefined ? data.year : academicYear.year,
        name: data.name !== undefined ? data.name : academicYear.name,
        startDate,
        endDate,
        isActive: data.isActive !== undefined ? data.isActive : academicYear.isActive,
      });

      return { success: true, message: "Academic year updated successfully", academicYear };
    } catch (error) {
      console.error("Update academic year error:", error);
      return { success: false, message: "Failed to update academic year", error: error.message };
    }
  }

  async createAcademicBlock(data) {
    try {
      const {
        academicYearId,
        term,
        half,
        blockType = ACADEMIC_BLOCK_TYPES.NORMAL,
        startDate,
        endDate,
        handoverStartDate,
        handoverEndDate,
        isActive = true,
      } = data;

      const validation = await this.validateBlockPayload({
        academicYearId,
        term,
        half,
        blockType,
        startDate,
        endDate,
        handoverStartDate,
        handoverEndDate,
      });
      if (!validation.success) return validation;

      const academicYear = validation.academicYear;
      const blockCode = data.blockCode || this.buildBlockCode(academicYear.year, term, half, blockType);
      const existingCode = await AcademicBlock.findOne({ where: { blockCode } });
      if (existingCode) return { success: false, message: "Academic block code already exists" };

      const academicBlock = await AcademicBlock.create({
        academicYearId,
        blockCode,
        term,
        half: blockType === ACADEMIC_BLOCK_TYPES.BLOCK3 ? null : half,
        blockType,
        startDate,
        endDate,
        handoverStartDate: handoverStartDate || null,
        handoverEndDate: handoverEndDate || null,
        isActive,
      });

      return { success: true, message: "Academic block created successfully", academicBlock };
    } catch (error) {
      console.error("Create academic block error:", error);
      return { success: false, message: "Failed to create academic block", error: error.message };
    }
  }

  async validateBlockPayload(data, currentBlockId = null) {
    const { academicYearId, term, half, blockType, startDate, endDate, handoverStartDate, handoverEndDate } = data;

    if (!academicYearId) return { success: false, message: "academicYearId is required" };
    if (!ACADEMIC_TERM_VALUES.includes(term)) return { success: false, message: "Invalid academic term" };
    if (!ACADEMIC_BLOCK_TYPE_VALUES.includes(blockType)) return { success: false, message: "Invalid academic block type" };
    if (blockType === ACADEMIC_BLOCK_TYPES.NORMAL && !ACADEMIC_HALF_VALUES.includes(half)) {
      return { success: false, message: "Normal academic block requires half H1 or H2" };
    }

    const rangeError = this.validateDateRange(startDate, endDate, "Academic block");
    if (rangeError) return { success: false, message: rangeError };

    if (handoverStartDate || handoverEndDate) {
      const handoverError = this.validateDateRange(handoverStartDate, handoverEndDate, "Handover period");
      if (handoverError) return { success: false, message: handoverError };
    }

    const academicYear = await AcademicYear.findByPk(academicYearId);
    if (!academicYear) return { success: false, message: "Academic year not found" };

    if (new Date(startDate) < new Date(academicYear.startDate) || new Date(endDate) > new Date(academicYear.endDate)) {
      return { success: false, message: "Academic block dates must be inside the academic year" };
    }

    const overlapWhere = {
      academicYearId,
      isActive: true,
      startDate: { [Op.lte]: endDate },
      endDate: { [Op.gte]: startDate },
    };
    if (currentBlockId) overlapWhere.academicBlockId = { [Op.ne]: currentBlockId };

    const overlappingBlock = await AcademicBlock.findOne({ where: overlapWhere });
    if (overlappingBlock) {
      return {
        success: false,
        message: `Academic block overlaps with ${overlappingBlock.blockCode}`,
      };
    }

    return { success: true, academicYear };
  }

  async listAcademicBlocks(filters = {}) {
    try {
      const where = {};
      if (filters.academicYearId) where.academicYearId = filters.academicYearId;
      if (filters.term) where.term = filters.term;
      if (filters.half) where.half = filters.half;
      if (filters.blockType) where.blockType = filters.blockType;
      if (filters.isActive !== undefined) where.isActive = filters.isActive === true || filters.isActive === "true";

      const academicBlocks = await AcademicBlock.findAll({
        where,
        include: [{ model: AcademicYear, as: "academicYear" }],
        order: [["startDate", "ASC"]],
      });

      return { success: true, data: academicBlocks };
    } catch (error) {
      console.error("List academic blocks error:", error);
      return { success: false, message: "Failed to retrieve academic blocks", error: error.message };
    }
  }

  async getCurrentAcademicBlock(referenceDate = new Date()) {
    try {
      const date = toDateOnly(referenceDate);
      const academicBlock = await AcademicBlock.findOne({
        where: {
          isActive: true,
          startDate: { [Op.lte]: date },
          endDate: { [Op.gte]: date },
        },
        include: [{ model: AcademicYear, as: "academicYear" }],
        order: [["startDate", "DESC"]],
      });

      return { success: true, data: academicBlock || null };
    } catch (error) {
      console.error("Get current academic block error:", error);
      return { success: false, message: "Failed to retrieve current academic block", error: error.message };
    }
  }

  async updateAcademicBlock(academicBlockId, data) {
    try {
      const academicBlock = await AcademicBlock.findByPk(academicBlockId);
      if (!academicBlock) return { success: false, message: "Academic block not found" };

      const nextData = {
        academicYearId: data.academicYearId || academicBlock.academicYearId,
        term: data.term || academicBlock.term,
        half: data.half !== undefined ? data.half : academicBlock.half,
        blockType: data.blockType || academicBlock.blockType,
        startDate: data.startDate || academicBlock.startDate,
        endDate: data.endDate || academicBlock.endDate,
        handoverStartDate: data.handoverStartDate !== undefined ? data.handoverStartDate : academicBlock.handoverStartDate,
        handoverEndDate: data.handoverEndDate !== undefined ? data.handoverEndDate : academicBlock.handoverEndDate,
      };

      const validation = await this.validateBlockPayload(nextData, academicBlockId);
      if (!validation.success) return validation;

      const academicYear = validation.academicYear;
      const blockCode = data.blockCode || academicBlock.blockCode || this.buildBlockCode(academicYear.year, nextData.term, nextData.half, nextData.blockType);
      if (blockCode !== academicBlock.blockCode) {
        const existingCode = await AcademicBlock.findOne({
          where: { blockCode, academicBlockId: { [Op.ne]: academicBlockId } },
        });
        if (existingCode) return { success: false, message: "Academic block code already exists" };
      }

      await academicBlock.update({
        ...nextData,
        blockCode,
        half: nextData.blockType === ACADEMIC_BLOCK_TYPES.BLOCK3 ? null : nextData.half,
        isActive: data.isActive !== undefined ? data.isActive : academicBlock.isActive,
      });

      return { success: true, message: "Academic block updated successfully", academicBlock };
    } catch (error) {
      console.error("Update academic block error:", error);
      return { success: false, message: "Failed to update academic block", error: error.message };
    }
  }

  async validateEntityWithinBlock({ academicBlockId, startDate, endDate, entityLabel = "Entity" }) {
    if (!academicBlockId) return { success: true, academicBlock: null };

    const academicBlock = await AcademicBlock.findByPk(academicBlockId);
    if (!academicBlock || !academicBlock.isActive) {
      return { success: false, message: "Academic block not found or inactive" };
    }

    const actualStart = startDate || academicBlock.startDate;
    const actualEnd = endDate || academicBlock.endDate;
    const rangeError = this.validateDateRange(actualStart, actualEnd, entityLabel);
    if (rangeError) return { success: false, message: rangeError };

    if (new Date(actualStart) < new Date(academicBlock.startDate) || new Date(actualEnd) > new Date(academicBlock.endDate)) {
      return { success: false, message: `${entityLabel} dates must be inside academic block ${academicBlock.blockCode}` };
    }

    return { success: true, academicBlock };
  }
}

module.exports = new AcademicCalendarService();
