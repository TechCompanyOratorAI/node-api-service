const { ClassRubricCriteria, RubricCriteria, RubricTemplate, Class, User } = require("../models");
const { Op } = require("sequelize");
const db = require("../models");
const { QueryTypes } = require("sequelize");

class ClassRubricCriteriaService {
  async _copyFromTemplateInternal(classId, rubricTemplateId, userId, transaction) {
    try {
      const sourceCriteria = await RubricCriteria.findAll({
        where: {
          rubricTemplateId: rubricTemplateId,
          isActive: true,
        },
        order: [["displayOrder", "ASC"]],
        transaction,
      });

      if (sourceCriteria.length === 0) {
        return {
          success: false,
          message: "Template không có criteria nào để copy",
        };
      }

      const existingCriteria = await ClassRubricCriteria.findAll({
        where: {
          classId: classId,
          rubricTemplateId: rubricTemplateId,
          sourceCriteriaId: { [Op.ne]: null },
        },
        attributes: ["sourceCriteriaId"],
        transaction,
      });

      const existingSourceIds = existingCriteria.map((c) => c.sourceCriteriaId);

      const criteriaToCopy = sourceCriteria.filter(
        (c) => !existingSourceIds.includes(c.criteriaId)
      );

      if (criteriaToCopy.length === 0) {
        return {
          success: false,
          code: "ALREADY_COPIED",
          message: "Tất cả criteria đã được copy trước đó",
        };
      }

      const newCriteria = criteriaToCopy.map((criteria) => ({
        classId: classId,
        rubricTemplateId: rubricTemplateId,
        sourceCriteriaId: criteria.criteriaId,
        criteriaName: criteria.criteriaName,
        criteriaDescription: criteria.criteriaDescription,
        weight: criteria.weight,
        maxScore: criteria.maxScore,
        displayOrder: criteria.displayOrder,
        isActive: 1,
        createdBy: userId,
        updatedBy: userId,
      }));

      await ClassRubricCriteria.bulkCreate(newCriteria, { transaction });

      return {
        success: true,
        copiedCount: criteriaToCopy.length,
      };
    } catch (error) {
      return {
        success: false,
        message: "Lỗi khi copy criteria",
        error: error.message,
      };
    }
  }


  async _removeTemplateCriteriaInternal(classId, rubricTemplateId, transaction) {
    await ClassRubricCriteria.update(
      { isActive: 0 },
      {
        where: {
          classId: classId,
          rubricTemplateId: rubricTemplateId,
          sourceCriteriaId: { [Op.ne]: null },
        },
        transaction,
      }
    );
  }

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

      const result = await this._copyFromTemplateInternal(
        classId,
        rubricTemplateId,
        userId,
        transaction
      );

      if (!result.success && result.code !== "ALREADY_COPIED") {
        await transaction.rollback();
        return result;
      }

      await transaction.commit();

      if (result.code === "ALREADY_COPIED") {
        return {
          success: false,
          message: "Tất cả criteria đã được copy trước đó",
          code: "ALREADY_COPIED",
        };
      }

      return {
        success: true,
        message: `Đã copy ${result.copiedCount} criteria vào lớp học`,
        copiedCount: result.copiedCount,
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
      const existingCriteria = await ClassRubricCriteria.findAll({
        where: { classId, isActive: 1 },
        attributes: ["weight"],
      });

      const totalWeight = existingCriteria.reduce(
        (sum, c) => sum + (parseFloat(c.weight) || 0),
        0
      );

      if (totalWeight >= 100) {
        return {
          success: false,
          message: "Tổng trọng số đã đạt 100%. Không thể thêm criteria mới.",
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

      const { evaluationGuide, ...createData } = data;
      const criterion = await ClassRubricCriteria.create({
        ...createData,
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


  async updateCriterion(classRubricCriteriaId, data) {
    try {
      const criterion = await ClassRubricCriteria.findByPk(classRubricCriteriaId);

      if (!criterion) {
        return {
          success: false,
          message: "Class rubric criteria không tìm thấy",
        };
      }
      if (data.sourceCriteriaId !== undefined) {
        delete data.sourceCriteriaId;
      }
      if (data.rubricTemplateId !== undefined) {
        delete data.rubricTemplateId;
      }
      if (data.weight !== undefined) {
        const otherCriteria = await ClassRubricCriteria.findAll({
          where: {
            classId: criterion.classId,
            isActive: 1,
            classRubricCriteriaId: { [Op.ne]: classRubricCriteriaId },
          },
          attributes: ["weight"],
        });

        const currentTotal = otherCriteria.reduce(
          (sum, c) => sum + (parseFloat(c.weight) || 0),
          0
        );
        const newTotal = currentTotal + parseFloat(data.weight);

        if (newTotal > 100) {
          return {
            success: false,
            message: `Tổng trọng số không thể vượt quá 100%. Hiện tại đang là ${currentTotal}%, không thể thêm ${data.weight}% nữa.`,
          };
        }
      }

      const { evaluationGuide, ...updateData } = data;
      await criterion.update(updateData);

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

  async deleteCriterion(classRubricCriteriaId) {
    try {
      const criterion = await ClassRubricCriteria.findByPk(classRubricCriteriaId);

      if (!criterion) {
        return {
          success: false,
          message: "Class rubric criteria không tìm thấy",
        };
      }

      if (criterion.sourceCriteriaId !== null) {
        return {
          success: false,
          message: "Không thể xóa criteria được copy từ template gốc. Chỉ có thể tắt hoạt động.",
          code: "CANNOT_DELETE_TEMPLATE_CRITERIA",
        };
      }

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


  async getCriterionById(classRubricCriteriaId) {
    try {
      const criterion = await ClassRubricCriteria.findByPk(classRubricCriteriaId, {
        include: [
          { model: Class, as: "class", attributes: ["classId", "className"] },
          { model: RubricTemplate, as: "rubricTemplate", attributes: ["rubricTemplateId", "templateName"] },
          { model: RubricCriteria, as: "sourceCriteria", attributes: ["criteriaId", "criteriaName"] },
          { model: User, as: "creator", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: User, as: "updater", attributes: ["userId", "firstName", "lastName", "email"] },
        ],
      });

      if (!criterion) {
        return {
          success: false,
          message: "Class rubric criteria không tìm thấy",
        };
      }

      return {
        success: true,
        data: criterion,
      };
    } catch (error) {
      console.error("Get criterion by ID error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy chi tiết criteria",
        error: error.message,
      };
    }
  }

  /**
   * Restore a soft-deleted criterion
   */
  async restoreCriterion(classRubricCriteriaId, userId) {
    try {
      const criterion = await ClassRubricCriteria.findByPk(classRubricCriteriaId);

      if (!criterion) {
        return {
          success: false,
          message: "Class rubric criteria không tìm thấy",
        };
      }

      if (criterion.isActive === 1) {
        return {
          success: false,
          message: "Criteria đang ở trạng thái hoạt động",
        };
      }

      // Check total weight won't exceed 100% when restoring
      const otherCriteria = await ClassRubricCriteria.findAll({
        where: {
          classId: criterion.classId,
          isActive: 1,
        },
        attributes: ["weight"],
      });

      const currentTotal = otherCriteria.reduce(
        (sum, c) => sum + (parseFloat(c.weight) || 0),
        0
      );
      const restoreWeight = parseFloat(criterion.weight) || 0;
      const newTotal = currentTotal + restoreWeight;

      if (newTotal > 100) {
        return {
          success: false,
          message: `Tổng trọng số không thể vượt quá 100%. Hiện tại đang là ${currentTotal}%, không thể khôi phục criteria có trọng số ${restoreWeight}% (tổng sẽ là ${newTotal}%).`,
        };
      }

      await criterion.update({
        isActive: 1,
        updatedBy: userId,
      });

      return {
        success: true,
        data: criterion,
        message: "Khôi phục criteria thành công",
      };
    } catch (error) {
      console.error("Restore criterion error:", error);
      return {
        success: false,
        message: "Lỗi khi khôi phục criteria",
        error: error.message,
      };
    }
  }

  /**
   * Reorder multiple criteria (bulk update displayOrder)
   */
  async reorderCriteria(orders, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      const updatedIds = [];

      for (const order of orders) {
        const { classRubricCriteriaId, displayOrder } = order;

        if (!classRubricCriteriaId || typeof displayOrder !== "number") {
          await transaction.rollback();
          return {
            success: false,
            message: "Dữ liệu sắp xếp không hợp lệ",
          };
        }

        const criterion = await ClassRubricCriteria.findByPk(classRubricCriteriaId);

        if (!criterion) {
          await transaction.rollback();
          return {
            success: false,
            message: `Criteria với ID ${classRubricCriteriaId} không tìm thấy`,
          };
        }

        await criterion.update(
          { displayOrder, updatedBy: userId },
          { transaction }
        );

        updatedIds.push(classRubricCriteriaId);
      }

      await transaction.commit();

      return {
        success: true,
        message: `Đã cập nhật thứ tự cho ${updatedIds.length} criteria`,
        updatedCount: updatedIds.length,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Reorder criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi sắp xếp criteria",
        error: error.message,
      };
    }
  }

  async bulkDeleteCriteria(classRubricCriteriaIds) {
    const transaction = await db.sequelize.transaction();
    try {
      const ids = classRubricCriteriaIds.map((id) => parseInt(id));

      // Check if any of the criteria are from template
      const criteriaToDelete = await ClassRubricCriteria.findAll({
        where: {
          classRubricCriteriaId: { [Op.in]: ids },
        },
        attributes: ["classRubricCriteriaId", "sourceCriteriaId", "criteriaName"],
        transaction,
      });

      const templateCriteria = criteriaToDelete.filter((c) => c.sourceCriteriaId !== null);

      if (templateCriteria.length > 0) {
        await transaction.rollback();
        const names = templateCriteria.map((c) => c.criteriaName).join(", ");
        return {
          success: false,
          message: `Không thể xóa criteria được copy từ template: ${names}. Chỉ có thể xóa criteria tùy chỉnh.`,
          code: "CANNOT_DELETE_TEMPLATE_CRITERIA",
          templateCriteriaCount: templateCriteria.length,
        };
      }

      const count = await ClassRubricCriteria.update(
        { isActive: 0 },
        {
          where: {
            classRubricCriteriaId: { [Op.in]: ids },
          },
          transaction,
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Đã xóa ${count[0]} criteria thành công`,
        deletedCount: count[0],
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Bulk delete criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi xóa nhiều criteria",
        error: error.message,
      };
    }
  }

  /**
   * Get all class rubric criteria including inactive
   */
  async getAllClassRubricCriteria(classId) {
    try {
      const classExists = await Class.findByPk(classId);
      if (!classExists) {
        return {
          success: false,
          message: "Lớp học không tìm thấy",
        };
      }

      const criteria = await ClassRubricCriteria.findAll({
        where: { classId: classId },
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
        total: criteria.length,
        activeCount: criteria.filter((c) => c.isActive === 1).length,
        inactiveCount: criteria.filter((c) => c.isActive === 0).length,
      };
    } catch (error) {
      console.error("Get all class rubric criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi lấy danh sách criteria",
        error: error.message,
      };
    }
  }
  /**
   * Bulk update/create criteria for a class
   */
  async bulkUpdateCriteria(classId, criteriaData, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      const classExists = await Class.findByPk(classId);
      if (!classExists) {
        await transaction.rollback();
        return { success: false, message: "Lớp học không tìm thấy" };
      }

      const results = { updated: 0, created: 0 };

      for (const criteria of criteriaData) {
        // Luôn bỏ evaluationGuide nếu có gửi lên
        const { classRubricCriteriaId, evaluationGuide, ...data } = criteria;

        if (classRubricCriteriaId) {
          // Update existing criterion
          await ClassRubricCriteria.update(
            { ...data, updatedBy: userId },
            {
              where: { classRubricCriteriaId, classId },
              transaction,
            }
          );
          results.updated++;
        } else {
          // Create new custom criterion
          await ClassRubricCriteria.create(
            {
              ...data,
              classId,
              sourceCriteriaId: null,
              createdBy: userId,
              updatedBy: userId,
            },
            { transaction }
          );
          results.created++;
        }
      }

      // Check total weight after updates
      const allCriteria = await ClassRubricCriteria.findAll({
        where: { classId, isActive: 1 },
        transaction,
      });

      const totalWeight = allCriteria.reduce(
        (sum, c) => sum + (parseFloat(c.weight) || 0),
        0
      );

      if (totalWeight > 100) {
        await transaction.rollback();
        return {
          success: false,
          message: `Tổng trọng số hiện tại là ${totalWeight}%, vượt quá 100%. Vui lòng điều chỉnh lại.`,
          code: "WEIGHT_EXCEEDS_100",
        };
      }

      await transaction.commit();
      return {
        success: true,
        message: `Cập nhật thành công (${results.updated} cập nhật, ${results.created} tạo mới). Tổng weight: ${totalWeight}%`,
        data: results,
      };
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("Bulk update class criteria error:", error);
      return {
        success: false,
        message: "Lỗi khi cập nhật danh sách criteria",
        error: error.message,
      };
    }
  }
}

module.exports = new ClassRubricCriteriaService();