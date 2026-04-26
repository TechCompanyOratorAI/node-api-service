import db from "../models/index.js";

const { SubjectArea, Department, Course, CompetencyCatalog } = db;
const { Op } = db.Sequelize;

class SubjectAreaService {
  normalizePage(raw) {
    const page = parseInt(raw, 10);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }

  normalizeLimit(raw) {
    const limit = parseInt(raw, 10);
    if (!Number.isInteger(limit) || limit <= 0) return 20;
    return Math.min(limit, 100);
  }

  async listSubjectAreas(query = {}) {
    try {
      const page = this.normalizePage(query.page);
      const limit = this.normalizeLimit(query.limit);
      const offset = (page - 1) * limit;

      const where = {};
      if (query.search) {
        where[Op.or] = [
          { subjectCode: { [Op.like]: `%${query.search}%` } },
          { subjectName: { [Op.like]: `%${query.search}%` } },
        ];
      }
      if (query.departmentId) where.departmentId = parseInt(query.departmentId, 10);
      if (query.isActive !== undefined) where.isActive = query.isActive === "true" || query.isActive === true;

      const { count, rows } = await SubjectArea.findAndCountAll({
        where,
        include: [
          { model: Department, as: "department", attributes: ["departmentId", "departmentCode", "departmentName"] },
        ],
        order: [["subjectCode", "ASC"]],
        limit,
        offset,
      });

      return {
        success: true,
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error("List subject areas error:", error);
      return { success: false, message: "Failed to retrieve subject areas", error: error.message };
    }
  }

  async getSubjectAreaById(subjectAreaId) {
    try {
      const subjectArea = await SubjectArea.findByPk(subjectAreaId, {
        include: [
          { model: Department, as: "department", attributes: ["departmentId", "departmentCode", "departmentName"] },
        ],
      });
      if (!subjectArea) return { success: false, message: "Subject area not found" };
      return { success: true, data: subjectArea };
    } catch (error) {
      console.error("Get subject area by ID error:", error);
      return { success: false, message: "Failed to retrieve subject area", error: error.message };
    }
  }

  async createSubjectArea(payload) {
    try {
      const subjectCode = (payload.subjectCode || "").trim().toUpperCase();
      const subjectName = (payload.subjectName || "").trim();
      if (!subjectCode || !subjectName) {
        return { success: false, message: "subjectCode and subjectName are required" };
      }

      if (payload.departmentId) {
        const department = await Department.findByPk(payload.departmentId);
        if (!department) return { success: false, message: "departmentId is invalid" };
      }

      const existing = await SubjectArea.findOne({ where: { subjectCode } });
      if (existing) return { success: false, message: "subjectCode already exists" };

      const subjectArea = await SubjectArea.create({
        subjectCode,
        subjectName,
        majorId: null,
        departmentId: payload.departmentId || null,
        isActive: payload.isActive !== undefined ? !!payload.isActive : true,
      });

      return { success: true, message: "Subject area created successfully", data: subjectArea };
    } catch (error) {
      console.error("Create subject area error:", error);
      return { success: false, message: "Failed to create subject area", error: error.message };
    }
  }

  async updateSubjectArea(subjectAreaId, payload) {
    try {
      const subjectArea = await SubjectArea.findByPk(subjectAreaId);
      if (!subjectArea) return { success: false, message: "Subject area not found" };

      const updates = {};
      if (payload.subjectCode !== undefined) {
        const nextCode = String(payload.subjectCode).trim().toUpperCase();
        if (!nextCode) return { success: false, message: "subjectCode cannot be empty" };
        const existing = await SubjectArea.findOne({
          where: { subjectCode: nextCode, subjectAreaId: { [Op.ne]: subjectAreaId } },
        });
        if (existing) return { success: false, message: "subjectCode already exists" };
        updates.subjectCode = nextCode;
      }
      if (payload.subjectName !== undefined) {
        const nextName = String(payload.subjectName).trim();
        if (!nextName) return { success: false, message: "subjectName cannot be empty" };
        updates.subjectName = nextName;
      }

      const nextDepartmentId = payload.departmentId !== undefined ? payload.departmentId : subjectArea.departmentId;
      if (nextDepartmentId !== null && nextDepartmentId !== undefined) {
        const department = await Department.findByPk(nextDepartmentId);
        if (!department) return { success: false, message: "departmentId is invalid" };
      }

      updates.majorId = null;
      if (payload.departmentId !== undefined) updates.departmentId = payload.departmentId;
      if (payload.isActive !== undefined) updates.isActive = !!payload.isActive;

      await subjectArea.update(updates);
      return { success: true, message: "Subject area updated successfully", data: subjectArea };
    } catch (error) {
      console.error("Update subject area error:", error);
      return { success: false, message: "Failed to update subject area", error: error.message };
    }
  }

  async deleteSubjectArea(subjectAreaId) {
    try {
      const subjectArea = await SubjectArea.findByPk(subjectAreaId);
      if (!subjectArea) return { success: false, message: "Subject area not found" };

      const [courseCount, competencyCount] = await Promise.all([
        Course.count({ where: { subjectAreaId } }),
        CompetencyCatalog.count({ where: { subjectAreaId } }),
      ]);

      if (courseCount > 0 || competencyCount > 0) {
        return {
          success: false,
          message: "Cannot delete subject area because it is referenced by courses or competencies",
          references: { courseCount, competencyCount },
        };
      }

      await subjectArea.destroy();
      return { success: true, message: "Subject area deleted successfully" };
    } catch (error) {
      console.error("Delete subject area error:", error);
      return { success: false, message: "Failed to delete subject area", error: error.message };
    }
  }
}

export default new SubjectAreaService();
