const { ClassRubricCriteria, RubricCriteria, RubricTemplate, Class, User } = require("../models");
const { Op } = require("sequelize");
const db = require("../models");
const { QueryTypes } = require("sequelize");

class ClassRubricCriteriaService {
  /**
   * Copy all active criteria from RubricCriteria to ClassRubricCriteria
   */
  async copyFromTemplate(classId, rubricTemplateId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      // Check class exists
      const classExists = await Class.findByPk(classId);
      if (!classExists) {
        await transaction.rollback();
        return {
          success: false,
          message: "Lớp học không tìm thấy",
        };
      }

      // Check template exists
      const template = await RubricTemplate.findByPk(rubricTemplateId);
      if (!template) {
        await transaction.rollback();
        return {
          success: false,
          message: "Rubric template không tìm thấy",
        };
      }

      // Get active criteria from template
      const sourceCriteria = await RubricCriteria.findAll({
        where: {
          rubricTemplateId: rubricTemplateId,
          isActive: true,
        },
        order: [["displayOrder", "ASC"]],
      });

      if (sourceCriteria.length === 0) {
        await transaction.rollback();
        return {
          success: false,
          message: "Template không có criteria nào để copy",
        };
      }

      // Check for existing copied criteria (to prevent duplicates)
      const existingCriteria = await ClassRubricCriteria.findAll({
        where: {
          classId: classId,
          rubricTemplateId: rubricTemplateId,
          sourceCriteriaId: { [Op.ne]: null },
        },
        attributes: ["sourceCriteriaId"],
      });

      const existingSourceIds = existingCriteria.map((c) => c.sourceCriteriaId);

      // Filter out already copied criteria
      const criteriaToCopy = sourceCriteria.filter(
        (c) => !existingSourceIds.includes(c.criteriaId)
      );

      if (criteriaToCopy.length === 0) {
        await transaction.rollback();
        return {
          success: false,
          message: "Tất cả criteria đã được copy trước đó",
          code: "ALREADY_COPIED",
        };
      }

      // Insert new criteria
      const newCriteria = criteriaToCopy.map((criteria) => ({
        classId: classId,
        rubricTemplateId: rubricTemplateId,
        sourceCriteriaId: criteria.criteriaId,
        criteriaName: criteria.criteriaName,
        criteriaDescription: criteria.criteriaDescription,
        weight: criteria.weight,
        maxScore: criteria.maxScore,
        displayOrder: criteria.displayOrder,
        evaluationGuide: criteria.evaluationGuide,
        isActive: 1,
        createdBy: userId,
        updatedBy: userId,
      }));

      await ClassRubricCriteria.bulkCreate(newCriteria, { transaction });

      await transaction.commit();

      // Return updated class rubric criteria
      return {
        success: true,
        message: `Đã copy ${criteriaToCopy.length} criteria vào lớp học`,
        copiedCount: criteriaToCopy.length,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Copy rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi copy criteria",
        error: error.message,
      };
    }
  }

  /**
   * Get all active class rubric criteria ordered by displayOrder
   */
  async getClassRubricCriteria(classId) {
    try {
      // Check class exists
      const classExists = await Class.findByPk(classId);
      if (!classExists) {
        return {
          success: false,
          message: "Lớp học không tìm thấy",
        };
      }

      const criteria = await ClassRubricCriteria.findAll({
        where: {
          classId: classId,
          isActive: 1,
        },
        order: [["displayOrder", "ASC"]],
        include: [
          { model: RubricTemplate, as: "rubricTemplate", attributes: ["rubricTemplateId", "templateName"] },
          { model: RubricCriteria, as: "sourceCriteria", attributes: ["criteriaId", "criteriaName"] },
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: User, as: "updater", attributes: ["userId", "firstName", "lastName", "email"] },
        ],
      });

      return {
        success: true,
        data: criteria,
      };
    } catch (error) {
      console.error("Get class rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách criteria",
        error: error.message,
      };
    }
  }

  /**
   * Add a custom class criterion (not copied from template)
   */
  async createCustomCriterion(classId, data, userId) {
    try {
      // Check class exists
      const classExists = await Class.findByPk(classId);
      if (!classExists) {
        return {
          success: false,
          message: "Lớp học không tìm thấy",
        };
      }

      // If rubricTemplateId is provided, validate it
      if (data.rubricTemplateId) {
        const template = await RubricTemplate.findByPk(data.rubricTemplateId);
        if (!template) {
          return {
            success: false,
            message: "Rubric template không tìm thấy",
          };
        }
      }

      const criterion = await ClassRubricCriteria.create({
        ...data,
        classId: classId,
        sourceCriteriaId: null, // Custom criteria has no source
        createdBy: userId,
        updatedBy: userId,
      });

      return {
        success: true,
        data: criterion,
        message: "Tạo criteria tùy chỉnh thành công",
      };
    } catch (error) {
      console.error("Create custom criterion error:", error);
      return {
        success: false,
        message: "Lỗi khi tạo criteria tùy chỉnh",
        error: error.message,
      };
    }
  }

  /**
   * Update a class rubric criterion
   */
  async updateCriterion(classRubricCriteriaId, data) {
    try {
      const criterion = await ClassRubricCriteria.findByPk(classRubricCriteriaId);

      if (!criterion) {
        return {
          success: false,
          message: "Class rubric criteria không tìm thấy",
        };
      }

      await criterion.update(data);

      return {
        success: true,
        data: criterion,
        message: "Cập nhật criteria thành công",
      };
    } catch (error) {
      console.error("Update class rubric criterion error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật criteria",
        error: error.message,
      };
    }
  }

  /**
   * Soft delete a class rubric criterion
   */
  async deleteCriterion(classRubricCriteriaId) {
    try {
      const criterion = await ClassRubricCriteria.findByPk(classRubricCriteriaId);

      if (!criterion) {
        return {
          success: false,
          message: "Class rubric criteria không tìm thấy",
        };
      }

      // Soft delete
      await criterion.update({ isActive: 0 });

      return {
        success: true,
        message: "Xóa criteria thành công",
      };
    } catch (error) {
      console.error("Delete class rubric criterion error:", error);
      return {
        success: false,
        message: "Lỗi khi xóa criteria",
        error: error.message,
      };
    }
  }
}

module.exports = new ClassRubricCriteriaService();