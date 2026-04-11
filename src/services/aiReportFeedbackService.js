const { CriterionFeedback, AIReport, User, ClassRubricCriteria, Presentation } = require("../models");
const classGradeSyncService = require("./classGradeSyncService");

class CriterionFeedbackService {
  async create(reportId, data, instructorId) {
    const transaction = await CriterionFeedback.sequelize.transaction();
    try {
      const report = await AIReport.findByPk(reportId, { transaction });
      if (!report) {
        await transaction.rollback();
        return { success: false, message: "AI report không tìm thấy", code: "NOT_FOUND" };
      }

      const criteria = await ClassRubricCriteria.findByPk(data.classRubricCriteriaId, { transaction });
      if (!criteria) {
        await transaction.rollback();
        return { success: false, message: "Criteria không tìm thấy", code: "NOT_FOUND" };
      }

      if (criteria.classId !== report.classId) {
        await transaction.rollback();
        return { success: false, message: "Criteria không thuộc class của report này", code: "INVALID_CRITERIA" };
      }

      const existing = await CriterionFeedback.findOne({
        where: { reportId: parseInt(reportId), classRubricCriteriaId: parseInt(data.classRubricCriteriaId) },
        transaction,
      });
      if (existing) {
        await transaction.rollback();
        return {
          success: false,
          message: "Feedback cho criteria này đã tồn tại, dùng PUT để cập nhật",
          code: "ALREADY_EXISTS",
        };
      }

      const feedback = await CriterionFeedback.create(
        {
          reportId: parseInt(reportId),
          classRubricCriteriaId: parseInt(data.classRubricCriteriaId),
          instructorId,
          ...(data.score !== undefined ? { score: data.score } : {}),
          ...(data.comment !== undefined ? { comment: data.comment } : {}),
        },
        { transaction }
      );

      await transaction.commit();

      // Dong bo finalGrade sau khi tao feedback
      const presentation = await Presentation.findByPk(report.presentationId, {
        attributes: ["studentId"],
      });
      if (presentation) {
        await classGradeSyncService.syncEnrollmentFinalGrade(report.classId, presentation.studentId);
      }

      const created = await CriterionFeedback.findByPk(feedback.criterionFeedbackId, {
        include: [
          { model: User, as: "instructor", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: ClassRubricCriteria, as: "classRubricCriteria", attributes: ["classRubricCriteriaId", "criteriaName", "maxScore"] },
        ],
      });

      return { success: true, data: created, message: "Tạo criterion feedback thành công" };
    } catch (error) {
      await transaction.rollback();
      console.error("Create criterion feedback error:", error);
      return { success: false, message: "Lỗi khi tạo feedback", error: error.message };
    }
  }

  async upsert(reportId, classRubricCriteriaId, data, instructorId) {
    const transaction = await CriterionFeedback.sequelize.transaction();
    try {
      const report = await AIReport.findByPk(reportId, { transaction });
      if (!report) {
        await transaction.rollback();
        return { success: false, message: "AI report không tìm thấy", code: "NOT_FOUND" };
      }

      const rid = parseInt(reportId, 10);
      const cid = parseInt(classRubricCriteriaId, 10);

      // findOne + update/create is reliable on MySQL; Model.upsert() inserts duplicates if UNIQUE index is missing
      const existing = await CriterionFeedback.findOne({
        where: { reportId: rid, classRubricCriteriaId: cid },
        transaction,
      });

      const payload = {
        instructorId,
        ...(data.score !== undefined ? { score: data.score } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
      };

      if (existing) {
        await existing.update(payload, { transaction });
      } else {
        await CriterionFeedback.create(
          {
            reportId: rid,
            classRubricCriteriaId: cid,
            ...payload,
          },
          { transaction }
        );
      }

      await transaction.commit();

      // Dong bo finalGrade sau khi upsert feedback (vi score cua instructor co the thay doi)
      const presentation = await Presentation.findByPk(report.presentationId, {
        attributes: ["studentId"],
      });
      if (presentation) {
        await classGradeSyncService.syncEnrollmentFinalGrade(report.classId, presentation.studentId);
      }

      const updated = await CriterionFeedback.findOne({
        where: { reportId: rid, classRubricCriteriaId: cid },
        include: [
          { model: User, as: "instructor", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: ClassRubricCriteria, as: "classRubricCriteria", attributes: ["classRubricCriteriaId", "criteriaName", "maxScore"] },
        ],
      });

      return { success: true, data: updated, message: "Đã cập nhật feedback của criteria" };
    } catch (error) {
      await transaction.rollback();
      console.error("Upsert criterion feedback error:", error);
      return { success: false, message: "Lỗi khi cập nhật feedback", error: error.message };
    }
  }

  async delete(reportId, classRubricCriteriaId) {
    try {
      // Lay thong tin report truoc khi xoa de biet studentId va classId
      const report = await AIReport.findByPk(parseInt(reportId, 10), {
        attributes: ["reportId", "classId", "presentationId"],
      });
      if (!report) {
        return { success: false, message: "AI report không tìm thấy", code: "NOT_FOUND" };
      }

      const deleted = await CriterionFeedback.destroy({
        where: { reportId: parseInt(reportId, 10), classRubricCriteriaId: parseInt(classRubricCriteriaId, 10) },
      });

      if (!deleted) {
        return { success: false, message: "Criterion feedback không tìm thấy", code: "NOT_FOUND" };
      }

      // Dong bo finalGrade sau khi xoa feedback
      const presentation = await Presentation.findByPk(report.presentationId, {
        attributes: ["studentId"],
      });
      if (presentation) {
        await classGradeSyncService.syncEnrollmentFinalGrade(report.classId, presentation.studentId);
      }

      return { success: true, message: "Đã xóa feedback của criteria" };
    } catch (error) {
      console.error("Delete criterion feedback error:", error);
      return { success: false, message: "Lỗi khi xóa feedback", error: error.message };
    }
  }

  async getByReportId(reportId) {
    try {
      const feedbacks = await CriterionFeedback.findAll({
        where: { reportId: parseInt(reportId) },
        include: [
          { model: User, as: "instructor", attributes: ["userId", "firstName", "lastName", "email"] },
          { model: ClassRubricCriteria, as: "classRubricCriteria", attributes: ["classRubricCriteriaId", "criteriaName", "criteriaDescription", "maxScore"] },
        ],
        order: [["criterionFeedbackId", "ASC"]],
      });

      return { success: true, data: feedbacks };
    } catch (error) {
      console.error("Get criterion feedbacks error:", error);
      return { success: false, message: "Lỗi khi lấy feedback", error: error.message };
    }
  }
}

module.exports = new CriterionFeedbackService();
