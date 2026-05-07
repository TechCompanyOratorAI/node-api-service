"use strict";

const XLSX = require("xlsx");
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
          // Diem trung binh AI (overallScore stored as 0-1 scale, convert to 0-10)
          const totalScore = studentConfirmedReports.reduce(
            (sum, r) => sum + parseFloat(r.overallScore || 0) * 10,
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

        // Fallback: student in group but not the presentation owner —
        // derive scores from the group's confirmed reports via groupGradeMembersMap
        const studentGradeEntries = groupGradeMembersMap.get(student.userId);
        if (studentGradeEntries && studentGradeEntries.size > 0) {
          const groupReportIds = Array.from(studentGradeEntries.keys());

          if (overallAverageScore === null) {
            const groupReports = confirmedReports.filter((r) => groupReportIds.includes(r.reportId));
            if (groupReports.length > 0) {
              const total = groupReports.reduce((sum, r) => sum + parseFloat(r.overallScore || 0) * 10, 0);
              overallAverageScore = parseFloat((total / groupReports.length).toFixed(2));
            }
          }

          if (instructorAverageScore === null) {
            const grades = Array.from(studentGradeEntries.values()).map((e) => e.receivedGrade);
            instructorAverageScore = parseFloat(
              (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)
            );
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
            overallScore: report ? parseFloat((parseFloat(report.overallScore) * 10).toFixed(2)) : null,
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

  /**
   * Export class scores to Excel buffer
   * Accessible by Admin or assigned instructor
   */
  async exportClassScoresToExcel(classId, userId, userRole) {
    const result = await this.getClassScores(classId, userId, userRole);

    if (!result.success) {
      return result;
    }

    const { class: classData, students } = result.data;
    const exportedAt = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    // ── Build header row ────────────────────────────────────────
    const headers = [
      "STT",
      "Họ và Tên",
      "Email",
      "Điểm AI TB (0-10)",
      "Điểm GV TB (0-10)",
      "Điểm cuối kỳ",
    ];

    // ── Build data rows ─────────────────────────────────────────
    const rows = students.map((s, index) => {
      const fullName = `${s.student.lastName} ${s.student.firstName}`.trim();

      return [
        index + 1,
        fullName,
        s.student.email,
        s.overallAverageScore !== null ? s.overallAverageScore : "",
        s.instructorAverageScore !== null ? s.instructorAverageScore : "",
        s.finalGrade !== null && s.finalGrade !== undefined ? s.finalGrade : "",
      ];
    });

    // ── Assemble worksheet data ─────────────────────────────────
    const wsData = [
      // Row 1: Title
      [`BẢNG ĐIỂM LỚP ${classData.classCode}`],
      // Row 2: Export info
      [`Xuất lúc: ${exportedAt}`],
      // Row 3: blank spacer
      [],
      // Row 4: Headers
      headers,
      // Row 5+: Student data
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // ── Column widths ───────────────────────────────────────────
    const colWidths = [
      { wch: 5 },  // STT
      { wch: 25 }, // Họ tên
      { wch: 30 }, // Email
      { wch: 18 }, // Điểm AI TB
      { wch: 18 }, // Điểm GV TB
      { wch: 15 }, // Điểm cuối kỳ
    ];
    ws["!cols"] = colWidths;

    // ── Merge title cell across all columns ─────────────────────
    const totalCols = headers.length - 1;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols } }, // Title row
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols } }, // Export date row
    ];

    // ── Style: row heights ──────────────────────────────────────
    ws["!rows"] = [
      { hpt: 24 }, // Row 1: title
      { hpt: 16 }, // Row 2: date
      { hpt: 8 },  // Row 3: spacer
      { hpt: 40 }, // Row 4: headers (multi-line)
    ];

    // ── Workbook ────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bảng điểm");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return {
      success: true,
      buffer,
      filename: `bang_diem_${classData.classCode}_${Date.now()}.xlsx`,
    };
  }
}

module.exports = new ClassScoreService();
