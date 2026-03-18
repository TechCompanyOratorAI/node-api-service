const { RubricTemplate, RubricCriteria, ClassAISetting, User, Class } = require("../models");
const { Op } = require("sequelize");

class RubricTemplateService {
  async createTemplate(data, userId) {
    try {
      const template = await RubricTemplate.create({
        ...data,
        createdBy: userId,
        updatedBy: userId,
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
}

module.exports = new RubricTemplateService();