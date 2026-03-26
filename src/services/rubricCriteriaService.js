const { RubricCriteria, RubricTemplate, User } = require("../models");
const { Op } = require("sequelize");

class RubricCriteriaService {
  /**
   * Calculate total weight of all active criteria for a template
   */
  async getTotalWeight(templateId) {
    const criteria = await RubricCriteria.findAll({
      where: { rubricTemplateId: templateId, isActive: true },
    });
    return criteria.reduce((sum, c) => sum + parseFloat(c.weight || 0), 0);
  }

  async createCriteria(templateId, data) {
    try {
      const template = await RubricTemplate.findByPk(templateId);
      if (!template) {
        return {
          success: false,
          message: "Rubric template không tờm thấy",
        };
      }

      const currentWeight = await this.getTotalWeight(templateId);
      const newWeight = parseFloat(data.weight || 1);
      const totalWeight = currentWeight + newWeight;

      if (totalWeight > 100) {
        return {
          success: false,
          message: `Tổng weight của các criteria (${currentWeight}) + weight mới (${newWeight}) = ${totalWeight} vượt quá 100. Vui lòng giảm weight.`,
          code: "WEIGHT_EXCEEDS_100",
          currentWeight,
          newWeight,
          totalWeight,
        };
      }

      const criteria = await RubricCriteria.create({
        ...data,
        rubricTemplateId: templateId,
      });

      const finalWeight = currentWeight + newWeight;
      if (finalWeight === 100) {
        await template.update({ isActive: true });
        return {
          success: true,
          data: criteria,
          message: "Tạo criteria thành công. Template đã được kích hoạt (tổng weight = 100)",
          templateActivated: true,
        };
      }

      return {
        success: true,
        data: criteria,
        message: "Tạo criteria thành công",
        remainingWeight: 100 - finalWeight,
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

      const template = await RubricTemplate.findByPk(criteria.rubricTemplateId);

      if (data.weight !== undefined) {
        const currentWeight = await this.getTotalWeight(criteria.rubricTemplateId);
        const oldWeight = parseFloat(criteria.weight || 0);
        const newWeight = parseFloat(data.weight);
        const totalWeight = currentWeight - oldWeight + newWeight;

        if (totalWeight > 100) {
          return {
            success: false,
            message: `Tổng weight (${totalWeight}) đang vượt quá 100, yêu cầu giảm weight xuống.`,
            code: "WEIGHT_EXCEEDS_100",
            currentWeight: currentWeight - oldWeight,
            newWeight,
            totalWeight,
          };
        }
      }

      await criteria.update(data);

      const finalWeight = await this.getTotalWeight(criteria.rubricTemplateId);

      if (finalWeight === 100) {
        await template.update({ isActive: true });
        return {
          success: true,
          data: criteria,
          message: "Cập nhật criteria thành công. Template đã được kích hoạt (tổng weight = 100)",
          templateActivated: true,
        };
      }

      await template.update({ isActive: false });
      return {
        success: true,
        data: criteria,
        message: "Cập nhật criteria thành công",
        remainingWeight: 100 - finalWeight,
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

  /**
   * Get all rubric criteria (admin only)
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - Result with criteria list
   */
  async getAllCriteria(options = {}) {
    try {
      const { page = 1, limit = 50, templateId, isActive } = options;

      const where = {};
      if (templateId) {
        where.rubricTemplateId = templateId;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const { count, rows: criteria } = await RubricCriteria.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [["displayOrder", "ASC"]],
        include: [
          { model: RubricTemplate, as: "template", attributes: ["rubricTemplateId", "templateName"] },
        ],
      });

      return {
        success: true,
        data: {
          criteria,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      console.error("Get all rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách criteria",
        error: error.message,
      };
    }
  }

  /**
   * Get rubric criteria by ID
   * @param {number} criteriaId - Rubric Criteria ID
   * @returns {Promise<Object>} - Result with criteria data
   */
  async getCriteriaById(criteriaId) {
    try {
      const criteria = await RubricCriteria.findByPk(criteriaId, {
        include: [
          { model: RubricTemplate, as: "template", attributes: ["rubricTemplateId", "templateName"] },
        ],
      });

      if (!criteria) {
        return {
          success: false,
          message: "Rubric criteria không tìm thấy",
        };
      }

      return {
        success: true,
        data: criteria,
      };
    } catch (error) {
      console.error("Get rubric criteria by ID error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy criteria",
        error: error.message,
      };
    }
  }
}

module.exports = new RubricCriteriaService();