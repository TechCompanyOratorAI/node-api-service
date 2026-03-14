const { RubricCriteria, RubricTemplate, User } = require("../models");
const { Op } = require("sequelize");

class RubricCriteriaService {
  async createCriteria(templateId, data) {
    try {
      // Check template exists
      const template = await RubricTemplate.findByPk(templateId);
      if (!template) {
        return {
          success: false,
          message: "Rubric template không tìm thấy",
        };
      }

      const criteria = await RubricCriteria.create({
        ...data,
        rubricTemplateId: templateId,
      });

      return {
        success: true,
        data: criteria,
        message: "Tạo criteria thành công",
      };
    } catch (error) {
      console.error("Create rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi tạo criteria",
        error: error.message,
      };
    }
  }

  async getCriteriaByTemplate(templateId) {
    try {
      // Check template exists
      const template = await RubricTemplate.findByPk(templateId);
      if (!template) {
        return {
          success: false,
          message: "Rubric template không tìm thấy",
        };
      }

      const criteria = await RubricCriteria.findAll({
        where: {
          rubricTemplateId: templateId,
          isActive: true,
        },
        order: [["displayOrder", "ASC"]],
      });

      return {
        success: true,
        data: criteria,
      };
    } catch (error) {
      console.error("Get rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách criteria",
        error: error.message,
      };
    }
  }

  async updateCriteria(criteriaId, data) {
    try {
      const criteria = await RubricCriteria.findByPk(criteriaId);

      if (!criteria) {
        return {
          success: false,
          message: "Rubric criteria không tìm thấy",
        };
      }

      await criteria.update(data);

      return {
        success: true,
        data: criteria,
        message: "Cập nhật criteria thành công",
      };
    } catch (error) {
      console.error("Update rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật criteria",
        error: error.message,
      };
    }
  }

  async deleteCriteria(criteriaId) {
    try {
      const criteria = await RubricCriteria.findByPk(criteriaId);

      if (!criteria) {
        return {
          success: false,
          message: "Rubric criteria không tìm thấy",
        };
      }

      // Soft delete
      await criteria.update({ isActive: false });

      return {
        success: true,
        message: "Xóa criteria thành công",
      };
    } catch (error) {
      console.error("Delete rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi xóa criteria",
        error: error.message,
      };
    }
  }
}

module.exports = new RubricCriteriaService();