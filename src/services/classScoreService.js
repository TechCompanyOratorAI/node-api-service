"use strict";

const db = require("../models");
const {
  Enrollment,
  Class,
  ClassInstructor,
  Presentation,
  AIReport,
  CriterionFeedback,
  ClassRubricCriteria,
  User,
  GroupGradeDistribution,
  GroupGradeMember,
  GroupStudent,
  TopicEnrollment,
} = db;

class ClassScoreService {
  /**
   * Get all students and their scores for a class
   * Accessible by Admin or the instructor assigned to the class
   */
  async getClassScores(classId, userId, userRole) {
    try {
      // Authorization: only Admin or assigned instructor can view scores
      if (userRole !== "Admin") {
        const isInstructor = await ClassInstructor.findOne({
          where: { classId, instructorId: userId },
        });

        if (!isInstructor) {
          return {
            success: false,
            message: "Bạn không có quyền xem điểm của lớp học này",
          };
        }
      }

      // Verify class exists
      const classData = await Class.findByPk(classId, {
        include: [{ model: User, as: "instructors", through: { attributes: [] }, attributes: ["userId", "firstName", "lastName"] }],
      });

      if (!classData) {
        return {
          success: false,
          message: "Lớp học không tìm thấy",
          code: "CLASS_NOT_FOUND",
        };
      }

      // Get all enrolled students in this class
      const enrollments = await Enrollment.findAll({
        where: { classId, status: "enrolled" },
        include: [
          {
            model: User,
            as: "student",
            attributes: ["userId", "username", "firstName", "lastName", "email", "avatar"],
          },
        ],
        order: [[{ model: User, as: "student" }, "firstName", "ASC"]],
      });

      if (!enrollments.length) {
        return {
          success: true,
          data: {
            class: {
              classId: classData.classId,
              classCode: classData.classCode,
              courseId: classData.courseId,
            },
            criteria: [],
            students: [],
          },
        };
      }

      const studentIds = enrollments.map((e) => e.student.userId);

      // Get all presentations for all students in this class
      const presentations = await Presentation.findAll({
        where: { classId },
        include: [
          {
            model: User,
            as: "student",
            attributes: ["userId"],
          },
        ],
      });

      // Get all confirmed AI reports for all students in this class
      const aiReports = await AIReport.findAll({
        where: { classId },
        attributes: [
          "reportId",
          "presentationId",
          "overallScore",
          "gradeForInstructor",
          "reportStatus",
          "criterionScores",
          "confirmedAt",
        ],
      });

      // Filter only confirmed reports
      const confirmedReports = aiReports.filter((r) => r.reportStatus === "confirmed");

      // Get all criterion feedbacks for confirmed reports
      const reportIds = confirmedReports.map((r) => r.reportId);

      let criterionFeedbacks = [];
      if (reportIds.length > 0) {
        criterionFeedbacks = await CriterionFeedback.findAll({
          where: { reportId: reportIds },
          include: [
            {
              model: ClassRubricCriteria,
              as: "classRubricCriteria",
              where: { isActive: 1 },
              required: false,
              attributes: ["classRubricCriteriaId", "criteriaName", "maxScore", "weight", "displayOrder"],
            },
            { model: User, as: "instructor", attributes: ["userId", "firstName", "lastName"] },
          ],
          order: [["classRubricCriteriaId", "ASC"]],
        });
      }

      // Get group grade distributions for confirmed reports in this class
      let groupGradeMembersMap = new Map(); // studentId -> Map(reportId -> receivedGrade)
      if (reportIds.length > 0) {
        const gradeDistributions = await GroupGradeDistribution.findAll({
          where: { reportId: reportIds },
          attributes: ["id", "reportId"],
        });
        const distributionIds = gradeDistributions.map((d) => d.id);
        const distReportMap = new Map(gradeDistributions.map((d) => [d.id, d.reportId]));

        if (distributionIds.length > 0) {
          const gradeMembers = await GroupGradeMember.findAll({
            where: { distributionId: distributionIds },
            attributes: ["id", "distributionId", "studentId", "percentage", "receivedGrade"],
          });

          gradeMembers.forEach((gm) => {
            const reportId = distReportMap.get(gm.distributionId);
            if (reportId) {
              if (!groupGradeMembersMap.has(gm.studentId)) {
                groupGradeMembersMap.set(gm.studentId, new Map());
              }
              groupGradeMembersMap.get(gm.studentId).set(reportId, {
                receivedGrade: parseFloat(gm.receivedGrade),
                percentage: parseFloat(gm.percentage),
              });
            }
          });
        }
      }

      // Get rubric criteria for this class (active only)
      const classCriteria = await ClassRubricCriteria.findAll({
        where: { classId, isActive: 1 },
        attributes: ["classRubricCriteriaId", "criteriaName", "maxScore", "weight", "displayOrder"],
        order: [["displayOrder", "ASC"]],
      });

      // Build report map by presentationId
      const reportMap = new Map();
      confirmedReports.forEach((r) => {
        reportMap.set(r.presentationId, r);
      });

      // Build feedback map by reportId
      const feedbackMap = new Map();
      criterionFeedbacks.forEach((f) => {
        if (!feedbackMap.has(f.reportId)) {
          feedbackMap.set(f.reportId, []);
        }
        feedbackMap.get(f.reportId).push(f);
      });

      // Build student scores
      const studentsData = enrollments.map((enrollment) => {
        const student = enrollment.student;
        const studentPresentations = presentations.filter(
          (p) => p.student && p.student.userId === student.userId
        );

        // Calculate average overall score from confirmed reports
        const studentConfirmedReports = confirmedReports.filter(
          (r) => {
            const p = presentations.find((pr) => pr.presentationId === r.presentationId);
            return p && p.student && p.student.userId === student.userId;
          }
        );

        let overallAverageScore = null;
        let instructorAverageScore = null;
        if (studentConfirmedReports.length > 0) {
          // Diem trung binh AI (overallScore)
          const totalScore = studentConfirmedReports.reduce(
            (sum, r) => sum + parseFloat(r.overallScore || 0),
            0
          );
          overallAverageScore = parseFloat((totalScore / studentConfirmedReports.length).toFixed(2));

          // Diem trung binh GV: uu tien receivedGrade (da chia boi leader),
          // neu chua chia thi dung gradeForInstructor
          const gradeEntries = studentConfirmedReports
            .filter((r) => r.gradeForInstructor !== null && r.gradeForInstructor !== undefined)
            .map((r) => {
              const distributed = groupGradeMembersMap.get(student.userId)?.get(r.reportId);
              if (distributed) {
                return distributed.receivedGrade;
              }
              return parseFloat(r.gradeForInstructor);
            });

          if (gradeEntries.length > 0) {
            const totalInstructorScore = gradeEntries.reduce((sum, g) => sum + g, 0);
            instructorAverageScore = parseFloat((totalInstructorScore / gradeEntries.length).toFixed(2));
          }
        }

        // Build rubric score breakdown per criteria
        const rubricScores = classCriteria.map((criteria) => {
          let totalScore = 0;
          let count = 0;

          studentConfirmedReports.forEach((report) => {
            const feedbacks = feedbackMap.get(report.reportId) || [];
            const feedback = feedbacks.find(
              (f) => f.classRubricCriteriaId === criteria.classRubricCriteriaId
            );
            if (feedback && feedback.score !== null) {
              totalScore += parseFloat(feedback.score);
              count++;
            }
          });

          return {
            classRubricCriteriaId: criteria.classRubricCriteriaId,
            criteriaName: criteria.criteriaName,
            maxScore: parseFloat(criteria.maxScore),
            weight: parseFloat(criteria.weight),
            averageScore: count > 0 ? parseFloat((totalScore / count).toFixed(2)) : null,
          };
        });

        // Presentations summary
        const presentationsSummary = studentPresentations.map((p) => {
          const report = reportMap.get(p.presentationId);
          const distributed = report
            ? groupGradeMembersMap.get(student.userId)?.get(report.reportId)
            : null;
          return {
            presentationId: p.presentationId,
            title: p.title,
            submittedAt: p.submissionDate,
            status: p.status,
            hasReport: !!report,
            overallScore: report ? parseFloat(report.overallScore) : null,
            gradeForInstructor: report && report.gradeForInstructor !== null
              ? parseFloat(report.gradeForInstructor)
              : null,
            // Diem da phan chia boi leader (neu co)
            receivedGrade: distributed ? distributed.receivedGrade : null,
            percentage: distributed ? distributed.percentage : null,
            reportStatus: report ? report.reportStatus : null,
            confirmedAt: report ? report.confirmedAt : null,
          };
        });

        return {
          enrollmentId: enrollment.enrollmentId,
          enrolledAt: enrollment.enrolledAt,
          finalGrade: enrollment.finalGrade,
          student: {
            userId: student.userId,
            username: student.username,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            avatar: student.avatar,
          },
          // Diem trung binh AI
          overallAverageScore,
          // Diem trung binh GV confirm (tu finalGrade da sync)
          instructorAverageScore,
          rubricScores,
          presentations: presentationsSummary,
          totalPresentations: studentPresentations.length,
          totalReports: studentConfirmedReports.length,
        };
      });

      return {
        success: true,
        data: {
          class: {
            classId: classData.classId,
            classCode: classData.classCode,
            courseId: classData.courseId,
            status: classData.status,
            instructors: classData.instructors || [],
          },
          criteria: classCriteria.map((c) => ({
            classRubricCriteriaId: c.classRubricCriteriaId,
            criteriaName: c.criteriaName,
            maxScore: parseFloat(c.maxScore),
            weight: parseFloat(c.weight),
            displayOrder: c.displayOrder,
          })),
          students: studentsData,
          totalStudents: studentsData.length,
        },
      };
    } catch (error) {
      console.error("Get class scores error:", error);
      return {
        success: false,
        message: "Không thể lấy danh sách điểm",
        error: error.message,
      };
    }
  }
}

module.exports = new ClassScoreService();
