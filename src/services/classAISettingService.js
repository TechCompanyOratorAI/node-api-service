const { ClassAISetting, RubricTemplate, AIConfig, Class, User } = require("../models");
const { Op } = require("sequelize");

class ClassAISettingService {
  async createClassAISetting(classId, data, userId) {
    try {
      // Check class exists
      const classExists = await Class.findByPk(classId);
      if (!classExists) {
        return {
          success: false,
          message: "Lớp học không tìm thấy",
        };
      }

      // Check if rubricTemplateId exists if provided
      if (data.rubricTemplateId) {
        const template = await RubricTemplate.findByPk(data.rubricTemplateId);
        if (!template) {
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
      });

      if (existingSetting) {
        return {
          success: false,
          message: "Lớp học đã có cài đặt AI đang hoạt động",
          code: "DUPLICATE_ACTIVE_SETTING",
        };
      }

      const setting = await ClassAISetting.create({
        ...data,
        classId: classId,
        createdBy: userId,
        updatedBy: userId,
      });

      return {
        success: true,
        data: setting,
        message: "Tạo cài đặt AI cho lớp thành công",
      };
    } catch (error) {
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

      // Check if rubricTemplateId exists if provided
      if (data.rubricTemplateId) {
        const template = await RubricTemplate.findByPk(data.rubricTemplateId);
        if (!template) {
          return {
            success: false,
            message: "Rubric template không tìm thấy",
          };
        }
      }

      await setting.update({
        ...data,
        updatedBy: userId,
      });

      return {
        success: true,
        data: setting,
        message: "Cập nhật cài đặt AI cho lớp thành công",
      };
    } catch (error) {
      console.error("Update class AI setting error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật cài đặt AI",
        error: error.message,
      };
    }
  }
}

module.exports = new ClassAISettingService();