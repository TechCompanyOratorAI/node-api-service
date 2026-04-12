"use strict";

const db = require("../models");
const { Enrollment, Presentation, AIReport } = db;

/**
 * Sync finalGrade vao bang Enrollments moi khi:
 * 1) GV confirm AI Report -> lay gradeForInstructor
 * 2) GV upsert/criterion Feedback
 *
 * Quy tac tinh diem:
 * Lay TAT CA confirmed reports cua student trong class
 * Neu co gradeForInstructor -> dung gradeForInstructor
 * Nguoc lai dung overallScore (diem AI)
 * finalGrade = trung binh cong, lam tron 2 chu so
 */
class ClassGradeSyncService {
  /**
   * Sync finalGrade cho 1 student hoac tat ca student trong class
   * Accessible by Admin or assigned instructor
   */
  async syncEnrollmentFinalGrade(classId, studentId = null) {
    try {
      const whereEnrollment = { classId, status: "enrolled" };
      if (studentId) whereEnrollment.studentId = studentId;

      const enrollments = await Enrollment.findAll({ where: whereEnrollment });

      if (!enrollments.length) return;

      const studentIds = enrollments.map((e) => e.studentId);

      // Lay presentationIds cua cac student trong class nay
      const presentations = await Presentation.findAll({
        where: { classId, studentId: studentIds },
        attributes: ["presentationId", "studentId"],
      });
      const presentationMap = new Map();
      presentations.forEach((p) => presentationMap.set(p.presentationId, p.studentId));

      const presentationIds = presentations.map((p) => p.presentationId);

      if (!presentationIds.length) {
        await Enrollment.update({ finalGrade: null }, { where: whereEnrollment });
        return;
      }

      // Lay TAT CA confirmed AI Reports cua cac presentation nay
      const confirmedReports = await AIReport.findAll({
        where: {
          presentationId: presentationIds,
          reportStatus: "confirmed",
        },
        attributes: ["reportId", "presentationId", "overallScore", "gradeForInstructor"],
      });

      // Map reportId -> studentId
      const reportStudentMap = new Map();
      confirmedReports.forEach((r) => {
        const sid = presentationMap.get(r.presentationId);
        if (sid) reportStudentMap.set(r.reportId, sid);
      });

      // Tinh finalGrade cho tung student
      const gradeUpdates = new Map();

      enrollments.forEach((e) => {
        if (!gradeUpdates.has(e.studentId)) gradeUpdates.set(e.studentId, []);
      });

      confirmedReports.forEach((r) => {
        const sid = reportStudentMap.get(r.reportId);
        if (!sid || !gradeUpdates.has(sid)) return;

        // Uu tien gradeForInstructor (diem GV confirm), neu khong co thi overallScore (diem AI)
        const score =
          r.gradeForInstructor !== null && r.gradeForInstructor !== undefined
            ? parseFloat(r.gradeForInstructor)
            : parseFloat(r.overallScore);

        if (!isNaN(score)) {
          gradeUpdates.get(sid).push(score);
        }
      });

      // Cap nhat finalGrade vao Enrollment
      for (const [sid, scores] of gradeUpdates) {
        const finalGrade =
          scores.length > 0
            ? parseFloat(
                (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
              )
            : null;

        await Enrollment.update({ finalGrade }, { where: { studentId: sid, classId } });
      }
    } catch (error) {
      console.error("Sync enrollment finalGrade error:", error);
    }
  }
}

module.exports = new ClassGradeSyncService();
