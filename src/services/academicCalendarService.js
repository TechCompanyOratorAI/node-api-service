"use strict";

const db = require("../models");
const {
  ACADEMIC_TERM_VALUES,
  ACADEMIC_HALF_VALUES,
  ACADEMIC_BLOCK_TYPES,
  ACADEMIC_BLOCK_TYPE_VALUES,
} = require("../constants/businessConstants");

const {
  AcademicYear,
  AcademicBlock,
  CourseAcademicBlock,
  ClassAcademicBlock,
  Course,
  Class,
} = db;
const { Op } = db.Sequelize;

const toDateOnly = (value) => {
  if (!value) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDateOnlyOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return toDateOnly(value);
};

class AcademicCalendarService {
  validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      return "Ngày bắt đầu và ngày kết thúc là bắt buộc";
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return "Ngày kết thúc phải sau ngày bắt đầu";
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
      const { year, name, isActive = true } = data;
      const startDate = normalizeDateOnlyOrNull(data.startDate);
      const endDate = normalizeDateOnlyOrNull(data.endDate);
      if (!startDate || !endDate) {
        return { success: false, message: "Ngày bắt đầu/kết thúc năm học phải có định dạng YYYY-MM-DD" };
      }
      const rangeError = this.validateDateRange(startDate, endDate, "Academic year");
      if (rangeError) return { success: false, message: rangeError };

      const existing = await AcademicYear.findOne({ where: { year } });
      if (existing) {
        return { success: false, message: "Năm học đã tồn tại" };
      }

      const academicYear = await AcademicYear.create({
        year,
        name: name || String(year),
        startDate,
        endDate,
        isActive,
      });

      return { success: true, message: "Đã tạo năm học thành công", academicYear };
    } catch (error) {
      console.error("Create academic year error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
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
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async updateAcademicYear(academicYearId, data) {
    try {
      const academicYear = await AcademicYear.findByPk(academicYearId);
      if (!academicYear) return { success: false, message: "Không tìm thấy năm học" };

      const normalizedStart = data.startDate !== undefined ? normalizeDateOnlyOrNull(data.startDate) : null;
      const normalizedEnd = data.endDate !== undefined ? normalizeDateOnlyOrNull(data.endDate) : null;
      if (data.startDate !== undefined && !normalizedStart) {
        return { success: false, message: "Ngày bắt đầu năm học phải có định dạng YYYY-MM-DD" };
      }
      if (data.endDate !== undefined && !normalizedEnd) {
        return { success: false, message: "Ngày kết thúc năm học phải có định dạng YYYY-MM-DD" };
      }
      const startDate = normalizedStart || academicYear.startDate;
      const endDate = normalizedEnd || academicYear.endDate;
      const rangeError = this.validateDateRange(startDate, endDate, "Academic year");
      if (rangeError) return { success: false, message: rangeError };

      await academicYear.update({
        year: data.year !== undefined ? data.year : academicYear.year,
        name: data.name !== undefined ? data.name : academicYear.name,
        startDate,
        endDate,
        isActive: data.isActive !== undefined ? data.isActive : academicYear.isActive,
      });

      return { success: true, message: "Đã cập nhật năm học thành công", academicYear };
    } catch (error) {
      console.error("Update academic year error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async createAcademicBlock(data) {
    try {
      const {
        academicYearId,
        term,
        half,
        blockType = ACADEMIC_BLOCK_TYPES.NORMAL,
        startDate: rawStartDate,
        endDate: rawEndDate,
        isActive = true,
      } = data;
      const startDate = normalizeDateOnlyOrNull(rawStartDate);
      const endDate = normalizeDateOnlyOrNull(rawEndDate);
      if (!startDate || !endDate) {
        return { success: false, message: "Ngày bắt đầu/kết thúc học kỳ phải có định dạng YYYY-MM-DD" };
      }

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
      if (existingCode) return { success: false, message: "Mã học kỳ đã tồn tại" };

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

      return { success: true, message: "Đã tạo học kỳ thành công", academicBlock };
    } catch (error) {
      console.error("Create academic block error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async validateBlockPayload(data, currentBlockId = null, transaction = null) {
    const { academicYearId, term, half, blockType, startDate, endDate } = data;

    if (!academicYearId) return { success: false, message: "Dữ liệu không hợp lệ" };
    if (!ACADEMIC_TERM_VALUES.includes(term)) return { success: false, message: "Học kỳ không hợp lệ" };
    if (!ACADEMIC_BLOCK_TYPE_VALUES.includes(blockType)) return { success: false, message: "Loại học kỳ không hợp lệ" };
    if (blockType === ACADEMIC_BLOCK_TYPES.NORMAL && !ACADEMIC_HALF_VALUES.includes(half)) {
      return { success: false, message: "Half không hợp lệ cho block type NORMAL" };
    }

    const rangeError = this.validateDateRange(startDate, endDate, "Academic block");
    if (rangeError) return { success: false, message: rangeError };

    const academicYear = await AcademicYear.findByPk(academicYearId, { transaction });
    if (!academicYear) return { success: false, message: "Không tìm thấy năm học" };

    if (new Date(startDate) < new Date(academicYear.startDate) || new Date(endDate) > new Date(academicYear.endDate)) {
      return { success: false, message: "Thời gian học kỳ phải nằm trong khoảng thời gian của năm học" };
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
        message: `Thời gian học kỳ bị trùng với học kỳ hiện có`,
      };
    }

    return { success: true, academicYear };
  }

  async deleteAcademicYear(academicYearId) {
    try {
      const academicYear = await AcademicYear.findByPk(academicYearId);
      if (!academicYear) return { success: false, message: "Không tìm thấy năm học" };

      const blockCount = await AcademicBlock.count({
        where: { academicYearId },
      });
      if (blockCount > 0) {
        return {
          success: false,
          message: "Không thể xóa niên khóa vì vẫn còn các học kỳ liên kết",
        };
      }

      await academicYear.destroy();
      return { success: true, message: "Đã xóa niên khóa thành công" };
    } catch (error) {
      console.error("Delete academic year error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async createAcademicBlocksBulk(data) {
    const transaction = await db.sequelize.transaction();
    try {
      const { academicYearId, term, blocks } = data;

      if (!academicYearId) {
        await transaction.rollback();
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }
      if (!ACADEMIC_TERM_VALUES.includes(term)) {
        await transaction.rollback();
        return { success: false, message: "Học kỳ không hợp lệ" };
      }
      if (!Array.isArray(blocks) || blocks.length === 0) {
        await transaction.rollback();
        return { success: false, message: "Danh sách blocks không hợp lệ hoặc đang rỗng" };
      }

      const createdBlocks = [];

      for (const block of blocks) {
        const payload = {
          academicYearId,
          term,
          half: block.half,
          blockType: block.blockType || ACADEMIC_BLOCK_TYPES.NORMAL,
          startDate: normalizeDateOnlyOrNull(block.startDate),
          endDate: normalizeDateOnlyOrNull(block.endDate),
        };
        if (!payload.startDate || !payload.endDate) {
          await transaction.rollback();
          return {
            success: false,
            message: `Dữ liệu block không hợp lệ (${block.blockType || "NORMAL"}-${block.half || "NA"}): ngày bắt đầu/kết thúc phải có định dạng YYYY-MM-DD`,
          };
        }

        const validation = await this.validateBlockPayload(payload, null, transaction);
        if (!validation.success) {
          await transaction.rollback();
          return {
            success: false,
            message: `Dữ liệu block không hợp lệ (${block.blockType || "NORMAL"}-${block.half || "NA"}): ${validation.message}`,
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
          return { success: false, message: `Mã học kỳ đã tồn tại: ${blockCode}` };
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
        message: "Đã tạo các học kỳ thành công",
        data: createdBlocks,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Create academic blocks bulk error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
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
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async getCurrentAcademicBlock(referenceDate = new Date()) {
    try {
      const date = toDateOnly(referenceDate);
      if (!date) {
        return { success: false, message: "Dữ liệu không hợp lệ" };
      }
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
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async updateAcademicBlock(academicBlockId, data) {
    try {
      const academicBlock = await AcademicBlock.findByPk(academicBlockId);
      if (!academicBlock) return { success: false, message: "Không tìm thấy học kỳ" };

      const normalizedStart = data.startDate !== undefined ? normalizeDateOnlyOrNull(data.startDate) : null;
      const normalizedEnd = data.endDate !== undefined ? normalizeDateOnlyOrNull(data.endDate) : null;
      if (data.startDate !== undefined && !normalizedStart) {
        return { success: false, message: "Ngày bắt đầu học kỳ phải có định dạng YYYY-MM-DD" };
      }
      if (data.endDate !== undefined && !normalizedEnd) {
        return { success: false, message: "Ngày kết thúc học kỳ phải có định dạng YYYY-MM-DD" };
      }

      const nextData = {
        academicYearId: data.academicYearId || academicBlock.academicYearId,
        term: data.term || academicBlock.term,
        half: data.half !== undefined ? data.half : academicBlock.half,
        blockType: data.blockType || academicBlock.blockType,
        startDate: normalizedStart || academicBlock.startDate,
        endDate: normalizedEnd || academicBlock.endDate,
      };

      const validation = await this.validateBlockPayload(nextData, academicBlockId);
      if (!validation.success) return validation;

      const academicYear = validation.academicYear;
      const blockCode = data.blockCode || academicBlock.blockCode || this.buildBlockCode(academicYear.year, nextData.term, nextData.half, nextData.blockType);
      if (blockCode !== academicBlock.blockCode) {
        const existingCode = await AcademicBlock.findOne({
          where: { blockCode, academicBlockId: { [Op.ne]: academicBlockId } },
        });
        if (existingCode) return { success: false, message: "Mã học kỳ đã tồn tại" };
      }

      await academicBlock.update({
        ...nextData,
        blockCode,
        half: nextData.blockType === ACADEMIC_BLOCK_TYPES.BLOCK3 ? null : nextData.half,
        isActive: data.isActive !== undefined ? data.isActive : academicBlock.isActive,
      });

      return { success: true, message: "Đã cập nhật học kỳ thành công", academicBlock };
    } catch (error) {
      console.error("Update academic block error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async deleteAcademicBlock(academicBlockId) {
    try {
      const academicBlock = await AcademicBlock.findByPk(academicBlockId);
      if (!academicBlock) return { success: false, message: "Không tìm thấy học kỳ" };

      const [courseBlockCount, classBlockCount, legacyCourseCount, legacyClassCount] = await Promise.all([
        CourseAcademicBlock.count({ where: { academicBlockId } }),
        ClassAcademicBlock.count({ where: { academicBlockId } }),
        Course.count({ where: { academicBlockId } }),
        Class.count({ where: { academicBlockId } }),
      ]);

      if (courseBlockCount > 0 || classBlockCount > 0 || legacyCourseCount > 0 || legacyClassCount > 0) {
        return {
          success: false,
          message: "Không thể xóa học kỳ vì đang được sử dụng bởi các khóa học hoặc lớp học",
        };
      }

      await academicBlock.destroy();
      return { success: true, message: "Đã xóa học kỳ thành công" };
    } catch (error) {
      console.error("Delete academic block error:", error);
      return { success: false, message: "Thao tác thất bại", error: error.message };
    }
  }

  async validateEntityWithinBlock({ academicBlockId, startDate, endDate, entityLabel = "Entity" }) {
    if (!academicBlockId) return { success: true, academicBlock: null };

    const academicBlock = await AcademicBlock.findByPk(academicBlockId);
    if (!academicBlock || !academicBlock.isActive) {
      return { success: false, message: "Không tìm thấy dữ liệu" };
    }

    const actualStart = startDate || academicBlock.startDate;
    const actualEnd = endDate || academicBlock.endDate;
    const rangeError = this.validateDateRange(actualStart, actualEnd, entityLabel);
    if (rangeError) return { success: false, message: rangeError };

    if (new Date(actualStart) < new Date(academicBlock.startDate) || new Date(actualEnd) > new Date(academicBlock.endDate)) {
      return { success: false, message: `Thời gian phải nằm trong phạm vi của học kỳ hiện tại` };
    }

    return { success: true, academicBlock };
  }
}

module.exports = new AcademicCalendarService();
