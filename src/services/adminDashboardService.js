"use strict";

const db = require("../models");
const {
  User,
  Role,
  UserRole,
  Course,
  Class,
  Enrollment,
  Presentation,
  AIReport,
  Group,
  GroupGradeDistribution,
  ClassInstructor,
  Job,
} = db;

class AdminDashboardService {
  async getDashboardMetrics() {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // ── STAT COUNTS (parallel) ────────────────────────────────────────────
      const [
        totalUsers,
        totalStudents,
        totalInstructors,
        totalAdmins,
        weekNewUsers,
        totalCourses,
        totalClasses,
        activeClasses,
        totalPresentations,
        weekPresentations,
        todayPresentations,
        totalReports,
        confirmedReports,
        totalGroups,
        finalizedGroups,
        pendingJobs,
        processingJobs,
      ] = await Promise.all([
        // Users
        User.count(),
        UserRole.count({ include: [{ model: Role, as: "role", where: { roleName: "Student" } }] }),
        UserRole.count({ include: [{ model: Role, as: "role", where: { roleName: "Instructor" } }] }),
        UserRole.count({ include: [{ model: Role, as: "role", where: { roleName: "Admin" } }] }),
        User.count({ where: { createdAt: { [db.Sequelize.Op.gte]: weekStart } } }),
        // Courses & Classes
        Course.count({ where: { isActive: true } }),
        Class.count(),
        Class.count({ where: { status: "active" } }),
        // Presentations
        Presentation.count(),
        Presentation.count({ where: { createdAt: { [db.Sequelize.Op.gte]: weekStart } } }),
        Presentation.count({ where: { createdAt: { [db.Sequelize.Op.gte]: todayStart } } }),
        // Reports
        AIReport.count(),
        AIReport.count({ where: { reportStatus: "confirmed" } }),
        // Groups
        Group.count(),
        GroupGradeDistribution.count({ where: { status: "finalized" } }),
        // Jobs
        Job.count({ where: { status: "pending" } }),
        Job.count({ where: { status: "processing" } }),
      ]);

      const totalEnrollments = await Enrollment.count({ where: { status: "enrolled" } });

      // ── CHART 1: Presentations per day — last 30 days (bar) ──────────────
      const dailyRaw = await Presentation.findAll({
        attributes: [
          [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt")), "date"],
          [db.Sequelize.fn("COUNT", db.Sequelize.col("presentationId")), "count"],
        ],
        where: { createdAt: { [db.Sequelize.Op.gte]: thirtyDaysAgo } },
        group: [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt"))],
        order: [[db.Sequelize.fn("DATE", db.Sequelize.col("createdAt")), "ASC"]],
        raw: true,
      });

      const dateMap = new Map();
      for (let i = 0; i < 30; i++) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        dateMap.set(d.toISOString().slice(0, 10), 0);
      }
      dailyRaw.forEach((r) => {
        const key = r.date instanceof Date
          ? r.date.toISOString().slice(0, 10)
          : String(r.date).slice(0, 10);
        dateMap.set(key, parseInt(r.count) || 0);
      });

      const presentationsPerDay = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, presentations]) => ({
          date,
          label: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          presentations,
        }));

      // ── CHART 2: Report status breakdown (pie/donut) ─────────────────────
      const reportStatusCounts = await AIReport.findAll({
        attributes: [
          "reportStatus",
          [db.Sequelize.fn("COUNT", db.Sequelize.col("reportId")), "count"],
        ],
        group: ["reportStatus"],
        raw: true,
      });

      const reportStatusMap = {
        confirmed: 0, pending: 0, waiting: 0, pending_review: 0,
        generating: 0, completed: 0, failed: 0, rejected: 0, draft: 0,
      };
      reportStatusCounts.forEach((r) => {
        const key = r.reportStatus ?? "draft";
        if (key in reportStatusMap) reportStatusMap[key] = parseInt(r.count) || 0;
      });

      const reportStatusChart = [
        { label: "Đã xác nhận", key: "confirmed", count: reportStatusMap.confirmed },
        { label: "Chờ duyệt",   key: "pending",   count: reportStatusMap.pending },
        { label: "Hoàn thành",   key: "completed", count: reportStatusMap.completed },
        { label: "Đang xử lý",  key: "generating",count: reportStatusMap.generating },
        { label: "Từ chối",      key: "rejected",  count: reportStatusMap.rejected },
        { label: "Thất bại",     key: "failed",    count: reportStatusMap.failed },
        { label: "Đang chờ",     key: "waiting",   count: reportStatusMap.waiting },
        { label: "Chờ review",   key: "pending_review", count: reportStatusMap.pending_review },
        { label: "Bản nháp",    key: "draft",     count: reportStatusMap.draft },
      ].filter((e) => e.count > 0);

      // ── CHART 3: Users by role (pie/donut) ───────────────────────────────
      const usersByRole = [
        { label: "Sinh viên",  key: "student",    count: totalStudents },
        { label: "Giảng viên", key: "instructor", count: totalInstructors },
        { label: "Quản trị",   key: "admin",      count: totalAdmins },
      ];

      // ── CHART 4: Presentation status breakdown (pie) ─────────────────────
      const presStatusCounts = await Presentation.findAll({
        attributes: [
          "status",
          [db.Sequelize.fn("COUNT", db.Sequelize.col("presentationId")), "count"],
        ],
        group: ["status"],
        raw: true,
      });

      const presStatusMap = {
        draft: 0, submitted: 0, processing: 0, done: 0, failed: 0,
      };
      presStatusCounts.forEach((r) => {
        const key = r.status ?? "draft";
        if (key in presStatusMap) presStatusMap[key] = parseInt(r.count) || 0;
      });

      const presStatusLabels = {
        draft: "Bản nháp",
        submitted: "Đã nộp",
        processing: "Đang xử lý",
        done: "Hoàn thành",
        failed: "Thất bại",
      };

      const presentationsByStatus = Object.entries(presStatusMap)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => ({
          key,
          label: presStatusLabels[key] ?? key,
          count,
        }));

      // ── CHART 5: Score distribution (bar ranges) ─────────────────────────
      const scoreStats = await AIReport.findAll({
        attributes: [
          [db.Sequelize.fn("AVG", db.Sequelize.col("overallScore")), "avgScore"],
          [db.Sequelize.fn("COUNT", db.Sequelize.col("reportId")), "totalCount"],
        ],
        where: { reportStatus: "confirmed" },
        raw: true,
      });

      const avgScore = scoreStats[0]?.avgScore != null
        ? parseFloat(parseFloat(scoreStats[0].avgScore).toFixed(2))
        : null;

      const scoreRangeExpr = `CASE WHEN overallScore < 4 THEN '0-4' WHEN overallScore < 6 THEN '4-6' WHEN overallScore < 8 THEN '6-8' ELSE '8-10' END`;
      const scoreDist = await AIReport.findAll({
        attributes: [
          [db.Sequelize.literal(scoreRangeExpr), "overallScore"],
          [db.Sequelize.fn("COUNT", db.Sequelize.col("reportId")), "count"],
        ],
        where: {
          reportStatus: "confirmed",
          overallScore: { [db.Sequelize.Op.ne]: null },
        },
        group: [db.Sequelize.literal(scoreRangeExpr)],
        raw: true,
      });

      const scoreDistMap = { "0-4": 0, "4-6": 0, "6-8": 0, "8-10": 0 };
      scoreDist.forEach((s) => {
        const range = s.overallScore ?? "0-4";
        if (range in scoreDistMap) scoreDistMap[range] = parseInt(s.count) || 0;
      });

      const scoreDistribution = [
        { range: "0–4", key: "0-4", count: scoreDistMap["0-4"] },
        { range: "4–6", key: "4-6", count: scoreDistMap["4-6"] },
        { range: "6–8", key: "6-8", count: scoreDistMap["6-8"] },
        { range: "8–10", key: "8-10", count: scoreDistMap["8-10"] },
      ];

      // ── CHART 6: Reports per day last 14 days (bar) ──────────────────────
      const fourteenDaysAgo = new Date(todayStart);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const reportsDailyRaw = await AIReport.findAll({
        attributes: [
          [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt")), "date"],
          [db.Sequelize.fn("COUNT", db.Sequelize.col("reportId")), "count"],
        ],
        where: { createdAt: { [db.Sequelize.Op.gte]: fourteenDaysAgo } },
        group: [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt"))],
        order: [[db.Sequelize.fn("DATE", db.Sequelize.col("createdAt")), "ASC"]],
        raw: true,
      });

      const reportDateMap = new Map();
      for (let i = 0; i < 14; i++) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        reportDateMap.set(d.toISOString().slice(0, 10), 0);
      }
      reportsDailyRaw.forEach((r) => {
        const key = r.date instanceof Date
          ? r.date.toISOString().slice(0, 10)
          : String(r.date).slice(0, 10);
        reportDateMap.set(key, parseInt(r.count) || 0);
      });

      const reportsPerDay = Array.from(reportDateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, reports]) => ({
          date,
          label: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          reports,
        }));

      // ── CHART 7: Job queue status (bar) ─────────────────────────────────
      const jobStatusCounts = await Job.findAll({
        attributes: [
          "status",
          [db.Sequelize.fn("COUNT", db.Sequelize.col("jobId")), "count"],
        ],
        group: ["status"],
        raw: true,
      });

      const jobStatusLabels = {
        pending: "Chờ", processing: "Xử lý", done: "Hoàn thành", failed: "Thất bại",
      };
      const jobQueueChart = jobStatusCounts
        .map((j) => ({
          key: j.status ?? "pending",
          label: jobStatusLabels[j.status ?? "pending"] ?? j.status,
          count: parseInt(j.count) || 0,
        }))
        .filter((j) => j.count > 0);

      // ── TOP 5 compact lists ──────────────────────────────────────────────
      const topClasses = await Class.findAll({
        attributes: ["classId", "classCode", "status"],
        include: [
          { model: Enrollment, as: "enrollments", attributes: ["enrollmentId"], where: { status: "enrolled" }, required: false },
          { model: Course, as: "course", attributes: ["courseName"] },
        ],
        order: [[db.Sequelize.literal("(SELECT COUNT(*) FROM Enrollments WHERE Enrollments.classId = Class.classId AND Enrollments.status = 'enrolled')"), "DESC"]],
        limit: 5,
      });

      const topInstructors = await User.findAll({
        attributes: ["userId", "firstName", "lastName"],
        include: [
          { model: UserRole, as: "userRoles", required: true, include: [{ model: Role, as: "role", where: { roleName: "Instructor" } }] },
          { model: ClassInstructor, as: "classInstructors", attributes: ["classId"] },
        ],
        subQuery: false,
        limit: 5,
      });

      const recentUsers = await User.findAll({
        attributes: ["userId", "firstName", "lastName", "email", "createdAt"],
        include: [{ model: UserRole, as: "userRoles", include: [{ model: Role, as: "role", attributes: ["roleName"] }] }],
        order: [["createdAt", "DESC"]],
        subQuery: false,
        limit: 5,
      });

      const recentPresentations = await Presentation.findAll({
        attributes: ["presentationId", "title", "createdAt", "status"],
        include: [
          { model: User, as: "student", attributes: ["firstName", "lastName"] },
          { model: AIReport, as: "submission", attributes: ["overallScore", "reportStatus"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      });

      return {
        success: true,
        data: {
          // ── STAT CARDS ────────────────────────────────────────────────
          stats: {
            users:        { total: totalUsers,        students: totalStudents,    instructors: totalInstructors, newThisWeek: weekNewUsers },
            presentations:{ total: totalPresentations, thisWeek: weekPresentations, today: todayPresentations },
            reports:     { total: totalReports,      confirmed: confirmedReports, pending: totalReports - confirmedReports },
            courses:      { total: totalCourses,      classes: totalClasses,      active: activeClasses, enrollments: totalEnrollments },
            groups:      { total: totalGroups,        finalized: finalizedGroups },
            jobs:        { pending: pendingJobs,      processing: processingJobs },
            avgScore,
          },
          // ── CHART DATA ────────────────────────────────────────────────
          charts: {
            presentationsPerDay,
            reportsPerDay,
            reportStatus:    reportStatusChart,
            usersByRole,
            presentationsByStatus,
            scoreDistribution,
            jobQueue: jobQueueChart,
          },
          // ── COMPACT LISTS (top 5) ────────────────────────────────────
          topClasses: topClasses.map((c) => {
            const plain = c.toJSON ? c.toJSON() : c;
            return {
              classId: plain.classId,
              classCode: plain.classCode ?? "—",
              courseName: plain.course?.courseName ?? "—",
              enrollmentCount: plain.enrollments?.length ?? 0,
            };
          }),
          topInstructors: topInstructors.map((inst) => {
            const plain = inst.toJSON ? inst.toJSON() : inst;
            return {
              userId: plain.userId,
              name: `${plain.firstName ?? ""} ${plain.lastName ?? ""}`.trim(),
              initials: ((plain.firstName?.[0] ?? "") + (plain.lastName?.[0] ?? "")).toUpperCase(),
              classCount: plain.classInstructors?.length ?? 0,
            };
          }),
          recentUsers: recentUsers.map((u) => {
            const plain = u.toJSON ? u.toJSON() : u;
            const role = plain.userRoles?.[0]?.role?.roleName ?? "—";
            return {
              userId: plain.userId,
              name: `${plain.firstName ?? ""} ${plain.lastName ?? ""}`.trim(),
              initials: ((plain.firstName?.[0] ?? "") + (plain.lastName?.[0] ?? "")).toUpperCase(),
              email: plain.email,
              role,
              createdAt: plain.createdAt,
            };
          }),
          recentPresentations: recentPresentations.map((p) => {
            const plain = p.toJSON ? p.toJSON() : p;
            return {
              presentationId: plain.presentationId,
              title: plain.title ?? "—",
              studentName: plain.student
                ? `${plain.student.firstName ?? ""} ${plain.student.lastName ?? ""}`.trim()
                : "—",
              score: plain.submission?.overallScore != null
                ? parseFloat(plain.submission.overallScore).toFixed(1)
                : null,
              reportStatus: plain.submission?.reportStatus ?? null,
              createdAt: plain.createdAt,
            };
          }),
        },
      };
    } catch (error) {
      console.error("AdminDashboardService error:", error);
      return { success: false, message: "Lỗi khi lấy dashboard metrics", error: error.message };
    }
  }
}

module.exports = new AdminDashboardService();
