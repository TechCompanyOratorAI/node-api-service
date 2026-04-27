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
        isActive = true,
      } = data;

      const validation = await this.validateBlockPayload({
        academicYearId,
        term,
        half,
        blockType,
        startDate,
        endDate,
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
        isActive,
      });

      return { success: true, message: "Academic block created successfully", academicBlock };
    } catch (error) {
      console.error("Create academic block error:", error);
      return { success: false, message: "Failed to create academic block", error: error.message };
    }
  }

  async validateBlockPayload(data, currentBlockId = null, transaction = null) {
    const { academicYearId, term, half, blockType, startDate, endDate } = data;

    if (!academicYearId) return { success: false, message: "academicYearId is required" };
    if (!ACADEMIC_TERM_VALUES.includes(term)) return { success: false, message: "Invalid academic term" };
    if (!ACADEMIC_BLOCK_TYPE_VALUES.includes(blockType)) return { success: false, message: "Invalid academic block type" };
    if (blockType === ACADEMIC_BLOCK_TYPES.NORMAL && !ACADEMIC_HALF_VALUES.includes(half)) {
      return { success: false, message: "Normal academic block requires half H1 or H2" };
    }

    const rangeError = this.validateDateRange(startDate, endDate, "Academic block");
    if (rangeError) return { success: false, message: rangeError };

    const academicYear = await AcademicYear.findByPk(academicYearId, { transaction });
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

    const overlappingBlock = await AcademicBlock.findOne({ where: overlapWhere, transaction });
    if (overlappingBlock) {
      return {
        success: false,
        message: `Academic block overlaps with ${overlappingBlock.blockCode}`,
      };
    }

    return { success: true, academicYear };
  }

  async deleteAcademicYear(academicYearId) {
    try {
      const academicYear = await AcademicYear.findByPk(academicYearId);
      if (!academicYear) return { success: false, message: "Academic year not found" };

      const blockCount = await AcademicBlock.count({
        where: { academicYearId },
      });
      if (blockCount > 0) {
        return {
          success: false,
          message: "Cannot delete academic year while blocks still exist",
        };
      }

      await academicYear.destroy();
      return { success: true, message: "Academic year deleted successfully" };
    } catch (error) {
      console.error("Delete academic year error:", error);
      return { success: false, message: "Failed to delete academic year", error: error.message };
    }
  }

  async createAcademicBlocksBulk(data) {
    const transaction = await db.sequelize.transaction();
    try {
      const { academicYearId, term, blocks } = data;

      if (!academicYearId) {
        await transaction.rollback();
        return { success: false, message: "academicYearId is required" };
      }
      if (!ACADEMIC_TERM_VALUES.includes(term)) {
        await transaction.rollback();
        return { success: false, message: "Invalid academic term" };
      }
      if (!Array.isArray(blocks) || blocks.length === 0) {
        await transaction.rollback();
        return { success: false, message: "blocks must be a non-empty array" };
      }

      const createdBlocks = [];

      for (const block of blocks) {
        const payload = {
          academicYearId,
          term,
          half: block.half,
          blockType: block.blockType || ACADEMIC_BLOCK_TYPES.NORMAL,
          startDate: block.startDate,
          endDate: block.endDate,
        };

        const validation = await this.validateBlockPayload(payload, null, transaction);
        if (!validation.success) {
          await transaction.rollback();
          return {
            success: false,
            message: `Invalid block payload (${block.blockType || "NORMAL"}-${block.half || "NA"}): ${validation.message}`,
          };
        }

        const academicYear = validation.academicYear;
        const blockCode =
          block.blockCode ||
          this.buildBlockCode(academicYear.year, term, payload.half, payload.blockType);

        const existingCode = await AcademicBlock.findOne({
          where: { blockCode },
          transaction,
        });
        if (existingCode) {
          await transaction.rollback();
          return { success: false, message: `Academic block code already exists: ${blockCode}` };
        }

        const academicBlock = await AcademicBlock.create(
          {
            academicYearId,
            blockCode,
            term,
            half: payload.blockType === ACADEMIC_BLOCK_TYPES.BLOCK3 ? null : payload.half,
            blockType: payload.blockType,
            startDate: payload.startDate,
            endDate: payload.endDate,
            isActive: block.isActive !== undefined ? block.isActive : true,
          },
          { transaction }
        );

        createdBlocks.push(academicBlock);
      }

      await transaction.commit();
      return {
        success: true,
        message: "Academic blocks created successfully",
        data: createdBlocks,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Create academic blocks bulk error:", error);
      return { success: false, message: "Failed to create academic blocks", error: error.message };
    }
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

  async deleteAcademicBlock(academicBlockId) {
    try {
      const academicBlock = await AcademicBlock.findByPk(academicBlockId);
      if (!academicBlock) return { success: false, message: "Academic block not found" };

      await academicBlock.destroy();
      return { success: true, message: "Academic block deleted successfully" };
    } catch (error) {
      console.error("Delete academic block error:", error);
      return { success: false, message: "Failed to delete academic block", error: error.message };
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
