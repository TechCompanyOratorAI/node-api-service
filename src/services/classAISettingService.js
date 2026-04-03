const { ClassAISetting, RubricTemplate, AIConfig, Class, User } = require("../models");
const { Op } = require("sequelize");
const classRubricCriteriaService = require("./classRubricCriteriaService");

class ClassAISettingService {
  async createClassAISetting(classId, data, userId) {
    const transaction = await ClassAISetting.sequelize.transaction();

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

      // Check if rubricTemplateId exists if provided
      if (data.rubricTemplateId) {
        const template = await RubricTemplate.findByPk(data.rubricTemplateId);
        if (!template) {
          await transaction.rollback();
          return {
            success: false,
            message: "Rubric template không tìm thấy",
          };
        }
      }

      // Check if there's already an active AI setting for this class
      const existingSetting = await ClassAISetting.findOne({
        where: {
          classId: classId,
          isActive: true,
        },
        transaction,
      });

      if (existingSetting) {
        await transaction.rollback();
        return {
          success: false,
          message: "Lớp học đã có cài đặt AI đang hoạt động",
          code: "DUPLICATE_ACTIVE_SETTING",
        };
      }

      // Remove configId if provided (not allowed to be set via API)
      const { configId, ...safeData } = data;
      safeData.enableAiReport = true;
      safeData.requireInstructorConfirmation = true;

      const setting = await ClassAISetting.create(
        {
          ...safeData,
          classId: classId,
          createdBy: userId,
          updatedBy: userId,
        },
        { transaction }
      );

      // Auto-copy criteria from template if rubricTemplateId provided
      let criteriaCopyResult = null;
      if (data.rubricTemplateId) {
        criteriaCopyResult = await classRubricCriteriaService._copyFromTemplateInternal(
          classId,
          data.rubricTemplateId,
          userId,
          transaction
        );

        if (!criteriaCopyResult.success && criteriaCopyResult.code !== "ALREADY_COPIED") {
          await transaction.rollback();
          return {
            success: false,
            message: `Tạo cài đặt thành công nhưng lỗi khi copy criteria: ${criteriaCopyResult.message}`,
            error: criteriaCopyResult.error,
          };
        }
      }

      await transaction.commit();

      const response = {
        success: true,
        data: setting,
        message: "Tạo cài đặt AI cho lớp thành công",
      };

      if (criteriaCopyResult && criteriaCopyResult.copiedCount > 0) {
        response.criteriaCopied = true;
        response.copiedCount = criteriaCopyResult.copiedCount;
        response.message = `Tạo cài đặt AI và copy ${criteriaCopyResult.copiedCount} criteria từ template thành công`;
      } else if (criteriaCopyResult && criteriaCopyResult.code === "ALREADY_COPIED") {
        response.criteriaCopied = false;
        response.message = "Tạo cài đặt AI thành công. Criteria đã được copy trước đó";
      }

      return response;
    } catch (error) {
      await transaction.rollback();
      console.error("Create class AI setting error:", error);
      return {
        success: false,
        message: "Lỗi khi tạo cài đặt AI",
        error: error.message,
      };
    }
  }

  async getClassAISetting(classId) {
    try {
      const setting = await ClassAISetting.findOne({
        where: {
          classId: classId,
          isActive: true,
        },
        include: [
          { model: RubricTemplate, as: "rubricTemplate", attributes: ["rubricTemplateId", "templateName"] },
          { model: AIConfig, as: "aiConfig", attributes: ["configId", "configName"] },
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: User, as: "updater", attributes: ["userId", "firstName", "lastName", "email"] },
        ],
      });

      if (!setting) {
        return {
          success: false,
          message: "Cài đặt AI cho lớp không tìm thấy",
        };
      }

      return {
        success: true,
        data: setting,
      };
    } catch (error) {
      console.error("Get class AI setting error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy cài đặt AI",
        error: error.message,
      };
    }
  }

  async updateClassAISetting(classId, data, userId) {
    const transaction = await ClassAISetting.sequelize.transaction();

    try {
      const setting = await ClassAISetting.findOne({
        where: {
          classId: classId,
          isActive: true,
        },
        transaction,
      });

      if (!setting) {
        await transaction.rollback();
        return {
          success: false,
          message: "Cài đặt AI cho lớp không tìm thấy",
        };
      }

      const oldTemplateId = setting.rubricTemplateId;
      const newTemplateId = data.rubricTemplateId !== undefined ? data.rubricTemplateId : oldTemplateId;

      // Check if new rubricTemplateId exists if provided
      if (data.rubricTemplateId) {
        const template = await RubricTemplate.findByPk(data.rubricTemplateId);
        if (!template) {
          await transaction.rollback();
          return {
            success: false,
            message: "Rubric template không tìm thấy",
          };
        }
      }

      // Remove configId if provided (not allowed to be set via API)
      const { configId, ...safeData } = data;

      // Always enable AI Report and require instructor confirmation
      safeData.enableAiReport = true;
      safeData.requireInstructorConfirmation = true;

      await setting.update(
        {
          ...safeData,
          updatedBy: userId,
        },
        { transaction }
      );

      // Handle template switching: if template changed, replace criteria
      let criteriaResult = null;
      if (newTemplateId && oldTemplateId !== newTemplateId) {
        // Remove old copied criteria from previous template (only those with sourceCriteriaId)
        await classRubricCriteriaService._removeTemplateCriteriaInternal(
          classId,
          oldTemplateId,
          transaction
        );

        // Copy new template criteria
        criteriaResult = await classRubricCriteriaService._copyFromTemplateInternal(
          classId,
          newTemplateId,
          userId,
          transaction
        );

        if (!criteriaResult.success && criteriaResult.code !== "ALREADY_COPIED") {
          await transaction.rollback();
          return {
            success: false,
            message: `Cập nhật cài đặt thành công nhưng lỗi khi copy criteria mới: ${criteriaResult.message}`,
          };
        }
      }

      await transaction.commit();

      const response = {
        success: true,
        data: setting,
        message: "Cập nhật cài đặt AI cho lớp thành công",
      };

      if (criteriaResult && criteriaResult.copiedCount > 0) {
        response.templateSwitched = true;
        response.copiedCount = criteriaResult.copiedCount;
        response.message = `Đổi template thành công. Đã copy ${criteriaResult.copiedCount} criteria mới`;
      }

      return response;
    } catch (error) {
      await transaction.rollback();
      console.error("Update class AI setting error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật cài đặt AI",
        error: error.message,
      };
    }
  }

  /**
   * Delete (deactivate) class AI setting
   * @param {number} classId - Class ID
   * @returns {Promise<Object>} - Result of deletion
   */
  async deleteClassAISetting(classId) {
    try {
      const setting = await ClassAISetting.findOne({
        where: {
          classId: classId,
          isActive: true,
        },
      });

      if (!setting) {
        return {
          success: false,
          message: "Cài đặt AI cho lớp không tìm thấy",
        };
      }

      // Soft delete - set isActive to false
      await setting.update({ isActive: false });

      return {
        success: true,
        message: "Đã xóa cài đặt AI cho lớp",
      };
    } catch (error) {
      console.error("Delete class AI setting error:", error);
      return {
        success: false,
        message: "Lỗi khi xóa cài đặt AI",
        error: error.message,
      };
    }
  }

  /**
   * Get all class AI settings (for admin)
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - Result with settings list
   */
  async getAllClassAISettings(options = {}) {
    try {
      const { page = 1, limit = 20, classId, isActive } = options;

      const where = {};
      if (classId) {
        where.classId = classId;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const { count, rows: settings } = await ClassAISetting.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [["createdAt", "DESC"]],
        include: [
          { model: RubricTemplate, as: "rubricTemplate", attributes: ["rubricTemplateId", "templateName"] },
          { model: AIConfig, as: "aiConfig", attributes: ["configId", "configName"] },
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
        ],
      });

      return {
        success: true,
        data: {
          settings,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      console.error("Get all class AI settings error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách cài đặt AI",
        error: error.message,
      };
    }
  }

  /**
   * Get class AI setting by ID
   * @param {number} settingId - Class AISetting ID
   * @returns {Promise<Object>} - Result with setting data
   */
  async getClassAISettingById(settingId) {
    try {
      const setting = await ClassAISetting.findByPk(settingId, {
        include: [
          { model: RubricTemplate, as: "rubricTemplate", attributes: ["rubricTemplateId", "templateName"] },
          { model: AIConfig, as: "aiConfig", attributes: ["configId", "configName"] },
          { model: Class, as: "class", attributes: ["classId", "classCode"] },
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: User, as: "updater", attributes: ["userId", "firstName", "lastName", "email"] },
        ],
      });

      if (!setting) {
        return {
          success: false,
          message: "Cài đặt AI không tìm thấy",
        };
      }

      return {
        success: true,
        data: setting,
      };
    } catch (error) {
      console.error("Get class AI setting by ID error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy cài đặt AI",
        error: error.message,
      };
    }
  }
}

module.exports = new ClassAISettingService();