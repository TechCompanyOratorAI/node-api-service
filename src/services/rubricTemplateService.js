const { RubricTemplate, RubricCriteria, ClassAISetting, User, Class } = require("../models");
const { Op } = require("sequelize");

class RubricTemplateService {
  async createTemplate(data, userId) {
    try {
      const template = await RubricTemplate.create({
        ...data,
        createdBy: userId,
        updatedBy: userId,
        isActive: false,
      });
      return {
        success: true,
        data: template,
        message: "Tạo rubric template thành công",
      };
    } catch (error) {
      console.error("Create rubric template error:", error);
      return {
        success: false,
        message: "Lỗi khi tạo rubric template",
        error: error.message,
      };
    }
  }

  async getAllActiveTemplates() {
    try {
      const templates = await RubricTemplate.findAll({
        where: { isActive: true },
        order: [["isDefault", "DESC"], ["templateName", "ASC"]],
        include: [
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: RubricCriteria, as: "criteria", where: { isActive: true }, required: false, order: [["displayOrder", "ASC"]] },
        ],
      });
      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      console.error("Get all rubric templates error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách rubric templates",
        error: error.message,
      };
    }
  }

  /**
   * Get all rubric templates with pagination and filters (admin only)
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - Result with templates list
   */
  async getAllTemplates(options = {}) {
    try {
      const { page = 1, limit = 20, isActive, search } = options;

      const where = {};
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      if (search) {
        where.templateName = { [Op.like]: `%${search}%` };
      }

      const { count, rows: templates } = await RubricTemplate.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [["isDefault", "DESC"], ["templateName", "ASC"]],
        include: [
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: RubricCriteria, as: "criteria", where: { isActive: true }, required: false },
        ],
      });

      return {
        success: true,
        data: {
          templates,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      console.error("Get all rubric templates error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách rubric templates",
        error: error.message,
      };
    }
  }

  async getTemplateById(templateId) {
    try {
      const template = await RubricTemplate.findByPk(templateId, {
        include: [
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: User, as: "updater", attributes: ["userId", "firstName", "lastName", "email"] },
          {
            model: RubricCriteria,
            as: "criteria",
            where: { isActive: true },
            required: false,
            order: [["displayOrder", "ASC"]],
          },
        ],
      });

      if (!template) {
        return {
          success: false,
          message: "Rubric template không tìm thấy",
        };
      }

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      console.error("Get rubric template by id error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy rubric template",
        error: error.message,
      };
    }
  }

  async updateTemplate(templateId, data, userId) {
    try {
      const template = await RubricTemplate.findByPk(templateId);

      if (!template) {
        return {
          success: false,
          message: "Rubric template không tìm thấy",
        };
      }

      await template.update({
        ...data,
        updatedBy: userId,
      });

      return {
        success: true,
        data: template,
        message: "Cập nhật rubric template thành công",
      };
    } catch (error) {
      console.error("Update rubric template error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật rubric template",
        error: error.message,
      };
    }
  }

  async deleteTemplate(templateId) {
    try {
      const template = await RubricTemplate.findByPk(templateId);

      if (!template) {
        return {
          success: false,
          message: "Rubric template không tìm thấy",
        };
      }

      // Check if template is being used by active classes
      const classAiSettings = await ClassAISetting.findOne({
        where: {
          rubricTemplateId: templateId,
          isActive: true,
        },
      });

      if (classAiSettings) {
        return {
          success: false,
          message: "Không thể xóa rubric template đang được sử dụng bởi các lớp học",
          code: "TEMPLATE_IN_USE",
        };
      }

      // Soft delete
      await template.update({ isActive: false });

      return {
        success: true,
        message: "Xóa rubric template thành công",
      };
    } catch (error) {
      console.error("Delete rubric template error:", error);
      return {
        success: false,
        message: "Lỗi khi xóa rubric template",
        error: error.message,
      };
    }
  }

  async updateCriteria(templateId, criteriaData, userId) {
    const transaction = await RubricTemplate.sequelize.transaction();

    try {
      const template = await RubricTemplate.findByPk(templateId, { transaction });

      if (!template) {
        await transaction.rollback();
        return {
          success: false,
          message: "Rubric template không tìm thấy",
        };
      }

      // Tính tổng weight của tất cả criteria (bao gồm cả criteria mới và criteria đã tồn tại)
      const existingCriteria = await RubricCriteria.findAll({
        where: { rubricTemplateId: templateId, isActive: true },
        transaction,
      });

      // Tạo map để theo dõi criteria nào đang được cập nhật
      const criteriaMap = new Map();
      existingCriteria.forEach((c) => {
        criteriaMap.set(c.criteriaId, c.weight);
      });

      // Cập nhật weight từ criteriaData
      let totalWeight = 0;
      for (const criteria of criteriaData) {
        if (criteria.criteriaId && criteriaMap.has(criteria.criteriaId)) {
          totalWeight += parseFloat(criteria.weight);
          criteriaMap.set(criteria.criteriaId, criteria.weight);
        } else {
          totalWeight += parseFloat(criteria.weight);
        }
      }

      // Cập nhật hoặc tạo criteria
      for (const criteria of criteriaData) {
        if (criteria.criteriaId) {
          await RubricCriteria.update(
            {
              criteriaName: criteria.criteriaName,
              criteriaDescription: criteria.criteriaDescription,
              weight: criteria.weight,
              maxScore: criteria.maxScore,
              displayOrder: criteria.displayOrder,
              evaluationGuide: criteria.evaluationGuide,
              isActive: criteria.isActive !== false,
            },
            {
              where: { criteriaId: criteria.criteriaId, rubricTemplateId: templateId },
              transaction,
            }
          );
        } else {
          await RubricCriteria.create(
            {
              rubricTemplateId: templateId,
              criteriaName: criteria.criteriaName,
              criteriaDescription: criteria.criteriaDescription,
              weight: criteria.weight,
              maxScore: criteria.maxScore || 100,
              displayOrder: criteria.displayOrder || 0,
              evaluationGuide: criteria.evaluationGuide,
              isActive: criteria.isActive !== false ? true : false,
            },
            { transaction }
          );
        }
      }

      // Kiểm tra tổng weight
      const allCriteria = await RubricCriteria.findAll({
        where: { rubricTemplateId: templateId, isActive: true },
        transaction,
      });

      const finalTotalWeight = allCriteria.reduce((sum, c) => sum + parseFloat(c.weight), 0);

      // Xác định trạng thái isActive của template dựa trên tổng weight
      let isActive = false;
      let message = "";

      if (finalTotalWeight > 100) {
        await transaction.rollback();
        return {
          success: false,
          message: `Tổng weight đang là ${finalTotalWeight}%, vượt quá 100%. Vui lòng giảm weight xuống để tổng bằng 100%.`,
          code: "WEIGHT_EXCEEDS_100",
          currentTotalWeight: finalTotalWeight,
        };
      } else if (finalTotalWeight < 100) {
        isActive = false;
        message = `Cập nhật criteria thành công nhưng template bị tắt do tổng weight chỉ là ${finalTotalWeight}%, chưa đủ 100%.`;
      } else {
        isActive = true;
        message = "Cập nhật criteria và kích hoạt template thành công";
      }

      await template.update({ isActive, updatedBy: userId }, { transaction });

      await transaction.commit();

      return {
        success: true,
        message,
        data: {
          template: { ...template.get(), isActive },
          totalWeight: finalTotalWeight,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Update criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật criteria",
        error: error.message,
      };
    }
  }
}

module.exports = new RubricTemplateService();