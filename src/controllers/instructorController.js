import db from '../models/index.js';

const {
  Presentation,
  User,
  Class,
  Course,
  AIReport,
  CourseInstructor,
  ClassInstructor,
  Enrollment,
  UserRole,
  Role,
} = db;

class InstructorController {
  async getInstructorScopeIds(instructorId, isAdmin = false) {
    if (isAdmin) {
      const allClasses = await Class.findAll({ attributes: ['classId'], raw: true });
      const allCourses = await Course.findAll({ attributes: ['courseId'], raw: true });
      return {
        classIds: allClasses.map((c) => c.classId),
        courseIds: allCourses.map((c) => c.courseId),
      };
    }

    const classIdSet = new Set();
    const courseIdSet = new Set();

    const [classInstructors, courseInstructors] = await Promise.all([
      ClassInstructor.findAll({
        where: { instructorId },
        attributes: ['classId'],
        raw: true,
      }),
      CourseInstructor.findAll({
        where: { instructorId },
        attributes: ['courseId'],
        raw: true,
      }),
    ]);

    classInstructors.forEach((c) => classIdSet.add(c.classId));
    courseInstructors.forEach((c) => courseIdSet.add(c.courseId));

    if (classIdSet.size > 0) {
      const classRows = await Class.findAll({
        where: { classId: { [db.Sequelize.Op.in]: [...classIdSet] } },
        attributes: ['courseId'],
        raw: true,
      });
      classRows.forEach((c) => {
        if (c.courseId) courseIdSet.add(c.courseId);
      });
    }

    return { classIds: [...classIdSet], courseIds: [...courseIdSet] };
  }

  // Dashboard cho instructor (có biểu đồ cột + quạt)
  async getDashboard(req, res) {
    try {
      const instructorId = req.user.userId;
      const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
      const { classIds, courseIds } = await this.getInstructorScopeIds(instructorId, isAdmin);

      if (classIds.length === 0 && courseIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            stats: {
              classes: { total: 0, active: 0 },
              courses: { total: 0 },
              students: { total: 0 },
              presentations: { total: 0, thisWeek: 0, today: 0 },
              reports: { total: 0, confirmed: 0, pending: 0 },
              avgScore: null,
            },
            charts: {
              presentationsPerDay: [],
              reportsPerDay: [],
              reportStatus: [],
              presentationsByStatus: [],
              scoreDistribution: [],
              studentsByClass: [],
            },
            recentPresentations: [],
          },
        });
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fourteenDaysAgo = new Date(todayStart);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const presentationWhere = {};
      if (classIds.length > 0) presentationWhere.classId = { [db.Sequelize.Op.in]: classIds };
      if (courseIds.length > 0) presentationWhere.courseId = { [db.Sequelize.Op.in]: courseIds };

      const reportWhere = {};
      if (classIds.length > 0) reportWhere.classId = { [db.Sequelize.Op.in]: classIds };

      const [totalClasses, activeClasses, totalCourses, totalStudents, totalPresentations, weekPresentations, todayPresentations, totalReports, confirmedReports] = await Promise.all([
        Class.count({ where: { classId: { [db.Sequelize.Op.in]: classIds } } }),
        Class.count({ where: { classId: { [db.Sequelize.Op.in]: classIds }, status: 'active' } }),
        Course.count({ where: { courseId: { [db.Sequelize.Op.in]: courseIds } } }),
        Enrollment.count({ where: { classId: { [db.Sequelize.Op.in]: classIds }, status: 'enrolled' } }),
        Presentation.count({ where: presentationWhere }),
        Presentation.count({ where: { ...presentationWhere, createdAt: { [db.Sequelize.Op.gte]: weekStart } } }),
        Presentation.count({ where: { ...presentationWhere, createdAt: { [db.Sequelize.Op.gte]: todayStart } } }),
        AIReport.count({ where: reportWhere }),
        AIReport.count({ where: { ...reportWhere, reportStatus: 'confirmed' } }),
      ]);

      const dailyRaw = await Presentation.findAll({
        attributes: [
          [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'date'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('presentationId')), 'count'],
        ],
        where: { ...presentationWhere, createdAt: { [db.Sequelize.Op.gte]: thirtyDaysAgo } },
        group: [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt'))],
        order: [[db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'ASC']],
        raw: true,
      });

      const dateMap = new Map();
      for (let i = 0; i < 30; i++) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        dateMap.set(d.toISOString().slice(0, 10), 0);
      }
      dailyRaw.forEach((r) => {
        const key = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
        dateMap.set(key, parseInt(r.count, 10) || 0);
      });
      const presentationsPerDay = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, presentations]) => ({
          date,
          label: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          presentations,
        }));

      const reportsDailyRaw = await AIReport.findAll({
        attributes: [
          [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'date'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('reportId')), 'count'],
        ],
        where: { ...reportWhere, createdAt: { [db.Sequelize.Op.gte]: fourteenDaysAgo } },
        group: [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt'))],
        order: [[db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'ASC']],
        raw: true,
      });

      const reportDateMap = new Map();
      for (let i = 0; i < 14; i++) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        reportDateMap.set(d.toISOString().slice(0, 10), 0);
      }
      reportsDailyRaw.forEach((r) => {
        const key = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
        reportDateMap.set(key, parseInt(r.count, 10) || 0);
      });
      const reportsPerDay = Array.from(reportDateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, reports]) => ({
          date,
          label: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          reports,
        }));

      const reportStatusCounts = await AIReport.findAll({
        attributes: ['reportStatus', [db.Sequelize.fn('COUNT', db.Sequelize.col('reportId')), 'count']],
        where: reportWhere,
        group: ['reportStatus'],
        raw: true,
      });
      const reportStatus = reportStatusCounts
        .map((r) => ({
          key: r.reportStatus || 'draft',
          label: r.reportStatus || 'draft',
          count: parseInt(r.count, 10) || 0,
        }))
        .filter((r) => r.count > 0);

      const presStatusCounts = await Presentation.findAll({
        attributes: ['status', [db.Sequelize.fn('COUNT', db.Sequelize.col('presentationId')), 'count']],
        where: presentationWhere,
        group: ['status'],
        raw: true,
      });
      const presentationsByStatus = presStatusCounts
        .map((r) => ({
          key: r.status || 'draft',
          label: r.status || 'draft',
          count: parseInt(r.count, 10) || 0,
        }))
        .filter((r) => r.count > 0);

      const scoreStats = await AIReport.findAll({
        attributes: [[db.Sequelize.fn('AVG', db.Sequelize.col('overallScore')), 'avgScore']],
        where: { ...reportWhere, reportStatus: 'confirmed' },
        raw: true,
      });
      const avgScore = scoreStats[0]?.avgScore != null ? parseFloat(parseFloat(scoreStats[0].avgScore).toFixed(2)) : null;

      const scoreRangeExpr = `CASE WHEN overallScore < 4 THEN '0-4' WHEN overallScore < 6 THEN '4-6' WHEN overallScore < 8 THEN '6-8' ELSE '8-10' END`;
      const scoreDist = await AIReport.findAll({
        attributes: [
          [db.Sequelize.literal(scoreRangeExpr), 'overallScore'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('reportId')), 'count'],
        ],
        where: {
          ...reportWhere,
          reportStatus: 'confirmed',
          overallScore: { [db.Sequelize.Op.ne]: null },
        },
        group: [db.Sequelize.literal(scoreRangeExpr)],
        raw: true,
      });
      const scoreDistMap = { '0-4': 0, '4-6': 0, '6-8': 0, '8-10': 0 };
      scoreDist.forEach((s) => {
        const range = s.overallScore || '0-4';
        if (range in scoreDistMap) scoreDistMap[range] = parseInt(s.count, 10) || 0;
      });
      const scoreDistribution = [
        { range: '0-4', key: '0-4', count: scoreDistMap['0-4'] },
        { range: '4-6', key: '4-6', count: scoreDistMap['4-6'] },
        { range: '6-8', key: '6-8', count: scoreDistMap['6-8'] },
        { range: '8-10', key: '8-10', count: scoreDistMap['8-10'] },
      ];

      const studentsByClassRaw = await Class.findAll({
        attributes: [
          'classId',
          'classCode',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('enrollments.enrollmentId')), 'count'],
        ],
        where: { classId: { [db.Sequelize.Op.in]: classIds } },
        include: [{
          model: Enrollment,
          as: 'enrollments',
          attributes: [],
          where: { status: 'enrolled' },
          required: false,
        }],
        group: ['Class.classId', 'Class.classCode'],
        raw: true,
      });
      const studentsByClass = studentsByClassRaw
        .map((r) => ({
          key: String(r.classId),
          label: r.classCode || `Class ${r.classId}`,
          count: parseInt(r.count, 10) || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const topPresentationsRaw = await Presentation.findAll({
        attributes: ['presentationId', 'title', 'status', 'createdAt'],
        where: presentationWhere,
        include: [
          { model: User, as: 'student', attributes: ['firstName', 'lastName'] },
          {
            model: AIReport,
            as: 'submission',
            attributes: ['overallScore', 'gradeForInstructor', 'reportStatus'],
            required: true,
            where: {
              reportStatus: 'confirmed',
              gradeForInstructor: { [db.Sequelize.Op.ne]: null },
            },
          },
          { model: Class, as: 'class', attributes: ['classCode'] },
        ],
        order: [[{ model: AIReport, as: 'submission' }, 'gradeForInstructor', 'DESC']],
        limit: 5,
      });

      const instructorUser = await User.findByPk(instructorId, {
        attributes: ['firstName', 'lastName', 'email'],
        include: [
          {
            model: UserRole,
            as: 'userRoles',
            required: false,
            include: [{ model: Role, as: 'role', attributes: ['roleName'] }],
          },
        ],
      });

      return res.status(200).json({
        success: true,
        data: {
          profile: {
            name: instructorUser ? `${instructorUser.firstName || ''} ${instructorUser.lastName || ''}`.trim() : '',
            email: instructorUser?.email || '',
          },
          stats: {
            classes: { total: totalClasses, active: activeClasses },
            courses: { total: totalCourses },
            students: { total: totalStudents },
            presentations: { total: totalPresentations, thisWeek: weekPresentations, today: todayPresentations },
            reports: { total: totalReports, confirmed: confirmedReports, pending: totalReports - confirmedReports },
            avgScore,
          },
          charts: {
            presentationsPerDay,
            reportsPerDay,
            reportStatus,
            presentationsByStatus,
            scoreDistribution,
            studentsByClass,
          },
          topPresentations: topPresentationsRaw.map((p) => {
            const plain = p.toJSON ? p.toJSON() : p;
            return {
              presentationId: plain.presentationId,
              title: plain.title || '—',
              classCode: plain.class?.classCode || '—',
              studentName: plain.student
                ? `${plain.student.firstName || ''} ${plain.student.lastName || ''}`.trim()
                : '—',
              score: plain.submission?.gradeForInstructor != null
                ? parseFloat(plain.submission.gradeForInstructor).toFixed(1)
                : null,
              reportStatus: plain.submission?.reportStatus || null,
              createdAt: plain.createdAt,
              status: plain.status,
            };
          }),
        },
      });
    } catch (error) {
      console.error('Instructor dashboard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Thao tác thất bại',
        error: error.message,
      });
    }
  }

  async getPresentations(req, res) {
    try {
      const instructorId = req.user.userId;
      const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
      const {
        search = '',
        status,
        classId,
        courseId,
        page = 1,
        limit = 12,
      } = req.query;

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
      const { classIds, courseIds } = await this.getInstructorScopeIds(instructorId, isAdmin);

      if (!isAdmin && classIds.length === 0 && courseIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            presentations: [],
            total: 0,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: 0,
          },
        });
      }

      const op = db.Sequelize.Op;
      const whereClause = {};

      if (classId) {
        whereClause.classId = parseInt(classId, 10);
      } else if (classIds.length > 0) {
        whereClause.classId = { [op.in]: classIds };
      }

      if (courseId) {
        whereClause.courseId = parseInt(courseId, 10);
      } else if (!whereClause.classId && courseIds.length > 0) {
        whereClause.courseId = { [op.in]: courseIds };
      }

      if (status) {
        whereClause.status = status;
      }

      const keyword = String(search || '').trim();
      if (keyword) {
        whereClause[op.or] = [
          { title: { [op.like]: `%${keyword}%` } },
          { description: { [op.like]: `%${keyword}%` } },
          { '$student.firstName$': { [op.like]: `%${keyword}%` } },
          { '$student.lastName$': { [op.like]: `%${keyword}%` } },
          { '$student.email$': { [op.like]: `%${keyword}%` } },
          { '$class.classCode$': { [op.like]: `%${keyword}%` } },
          { '$course.courseName$': { [op.like]: `%${keyword}%` } },
          { '$topic.topicName$': { [op.like]: `%${keyword}%` } },
        ];
      }

      const offset = (parsedPage - 1) * parsedLimit;

      const presentations = await Presentation.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
            required: false,
          },
          {
            model: Class,
            as: 'class',
            attributes: ['classId', 'classCode'],
            required: false,
          },
          {
            model: Course,
            as: 'course',
            attributes: ['courseId', 'courseCode', 'courseName'],
            required: false,
          },
          {
            model: db.Topic,
            as: 'topic',
            attributes: ['topicId', 'topicName'],
            required: false,
          },
          {
            model: AIReport,
            as: 'submission',
            attributes: ['reportId', 'overallScore', 'gradeForInstructor', 'reportStatus'],
            required: false,
          },
        ],
        order: [
          ['submissionDate', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: parsedLimit,
        offset,
        distinct: true,
        subQuery: false,
      });

      return res.status(200).json({
        success: true,
        data: {
          presentations: presentations.rows,
          total: presentations.count,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(presentations.count / parsedLimit),
        },
      });
    } catch (error) {
      console.error('Get instructor presentations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Thao tác thất bại',
        error: error.message,
      });
    }
  }

  // Duyệt submission cho presentation
  async approveSubmission(req, res) {
    try {
      const { presentationId } = req.params;
      const instructorId = req.user.userId;
      const { note } = req.body;

      const parsedPresentationId = parseInt(presentationId);
      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({
          success: false,
          message: 'PresentationId phải là số',
        });
      }

      const presentation = await Presentation.findByPk(parsedPresentationId, {
        include: [
          { model: User, as: 'student', attributes: ['userId', 'firstName', 'lastName', 'email'] },
          { model: Class, as: 'class', attributes: ['classId', 'classCode', 'className'] },
          { model: Course, as: 'course', attributes: ['courseId', 'courseCode', 'courseName'] },
        ],
      });

      if (!presentation) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài thuyết trình',
        });
      }

      // Kiểm tra instructor có quyền với class này
      // Instructor có thể được assigned qua ClassInstructor hoặc là instructorId trực tiếp
      let hasPermission = false;

      // Kiểm tra class instructor
      if (presentation.classId) {
        const classInstructor = await db.ClassInstructor.findOne({
          where: {
            classId: presentation.classId,
            instructorId: instructorId,
          },
        });

        // Hoặc kiểm tra trực tiếp trên class
        const classRecord = await Class.findOne({
          where: {
            classId: presentation.classId,
            instructorId: instructorId,
          },
        });

        hasPermission = !!classInstructor || !!classRecord;
      }

      // Kiểm tra course instructor
      if (!hasPermission && presentation.courseId) {
        const courseInstructor = await db.CourseInstructor.findOne({
          where: {
            courseId: presentation.courseId,
            instructorId: instructorId,
          },
        });
        hasPermission = !!courseInstructor;
      }

      // Admin luôn có quyền
      if (req.user.role === 'admin') {
        hasPermission = true;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to approve this presentation",
        });
      }

      // Kiểm tra đã được approve chưa
      if (presentation.instructorApproved) {
        return res.status(400).json({
          success: false,
          message: 'Có lỗi xảy ra',
          instructorApproved: true,
          approvedBy: presentation.approvedBy,
          approvedAt: presentation.approvedAt,
        });
      }

      // Cập nhật approval
      await presentation.update({
        instructorApproved: true,
        approvedBy: instructorId,
        approvedAt: new Date(),
      });

      // Lấy thông tin approver
      const approver = await User.findByPk(instructorId, {
        attributes: ['userId', 'firstName', 'lastName', 'email'],
      });

      console.log(`✅ Presentation ${presentationId} approved by instructor ${instructorId}`);

      return res.status(200).json({
        success: true,
        message: 'Có lỗi xảy ra',
        data: {
          presentationId: parsedPresentationId,
          instructorApproved: true,
          approvedBy: {
            userId: approver.userId,
            firstName: approver.firstName,
            lastName: approver.lastName,
          },
          approvedAt: presentation.approvedAt,
        },
      });
    } catch (error) {
      console.error('Approve submission error:', error);
      return res.status(500).json({
        success: false,
        message: 'Thao tác thất bại',
        error: error.message,
      });
    }
  }

  // Huỷ duyệt submission
  async unapproveSubmission(req, res) {
    try {
      const { presentationId } = req.params;
      const instructorId = req.user.userId;

      const parsedPresentationId = parseInt(presentationId);
      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({
          success: false,
          message: 'PresentationId phải là số',
        });
      }

      const presentation = await Presentation.findByPk(parsedPresentationId);

      if (!presentation) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài thuyết trình',
        });
      }

      // Kiểm tra instructor có quyền
      let hasPermission = false;

      if (presentation.classId) {
        const classInstructor = await db.ClassInstructor.findOne({
          where: {
            classId: presentation.classId,
            instructorId: instructorId,
          },
        });

        const classRecord = await Class.findOne({
          where: {
            classId: presentation.classId,
            instructorId: instructorId,
          },
        });

        hasPermission = !!classInstructor || !!classRecord;
      }

      if (!hasPermission && presentation.courseId) {
        const courseInstructor = await db.CourseInstructor.findOne({
          where: {
            courseId: presentation.courseId,
            instructorId: instructorId,
          },
        });
        hasPermission = !!courseInstructor;
      }

      if (req.user.role === 'admin') {
        hasPermission = true;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to unapprove this presentation",
        });
      }

      // Kiểm tra đã được approve chưa
      if (!presentation.instructorApproved) {
        return res.status(400).json({
          success: false,
          message: 'Có lỗi xảy ra',
          instructorApproved: false,
        });
      }

      // Cập nhật huỷ approval
      await presentation.update({
        instructorApproved: false,
        approvedBy: null,
        approvedAt: null,
      });

      console.log(`❌ Presentation ${presentationId} unapproved by instructor ${instructorId}`);

      return res.status(200).json({
        success: true,
        message: 'Có lỗi xảy ra',
        data: {
          presentationId: parsedPresentationId,
          instructorApproved: false,
        },
      });
    } catch (error) {
      console.error('Unapprove submission error:', error);
      return res.status(500).json({
        success: false,
        message: 'Thao tác thất bại',
        error: error.message,
      });
    }
  }

  // Lấy trạng thái approval
  async getApprovalStatus(req, res) {
    try {
      const { presentationId } = req.params;

      const parsedPresentationId = parseInt(presentationId);
      if (Number.isNaN(parsedPresentationId)) {
        return res.status(400).json({
          success: false,
          message: 'PresentationId phải là số',
        });
      }

      const presentation = await Presentation.findByPk(parsedPresentationId, {
        include: [
          { model: User, as: 'approver', attributes: ['userId', 'firstName', 'lastName', 'email'] },
        ],
      });

      if (!presentation) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài thuyết trình',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          presentationId: parsedPresentationId,
          instructorApproved: presentation.instructorApproved,
          approvedBy: presentation.approver
            ? {
                userId: presentation.approver.userId,
                firstName: presentation.approver.firstName,
                lastName: presentation.approver.lastName,
              }
            : null,
          approvedAt: presentation.approvedAt,
        },
      });
    } catch (error) {
      console.error('Get approval status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Thao tác thất bại',
        error: error.message,
      });
    }
  }

  // Lấy danh sách presentations cần duyệt
  async getPendingApprovals(req, res) {
    try {
      const instructorId = req.user.userId;
      const { classId, courseId, limit = 50, offset = 0 } = req.query;

      // Tìm tất cả class/course mà instructor phụ trách
      const classIds = [];
      const courseIds = [];

      // Classes where instructor is directly assigned
      const directClasses = await Class.findAll({
        where: { instructorId: instructorId },
        attributes: ['classId'],
      });
      classIds.push(...directClasses.map(c => c.classId));

      // Classes via ClassInstructor
      const classInstructors = await db.ClassInstructor.findAll({
        where: { instructorId: instructorId },
        attributes: ['classId'],
      });
      classIds.push(...classInstructors.map(c => c.classId));

      // Courses via CourseInstructor
      const courseInstructors = await db.CourseInstructor.findAll({
        where: { instructorId: instructorId },
        attributes: ['courseId'],
      });
      courseIds.push(...courseInstructors.map(c => c.courseId));

      // Xây dựng query
      const { Presentation, User } = db;
      const whereClause = {
        instructorApproved: false,
        status: ['draft', 'submitted'],
      };

      if (classId) {
        whereClause.classId = parseInt(classId);
      } else if (classIds.length > 0) {
        whereClause.classId = { [db.Sequelize.Op.in]: classIds };
      }

      if (courseId) {
        whereClause.courseId = parseInt(courseId);
      } else if (courseIds.length > 0 && classIds.length === 0) {
        whereClause.courseId = { [db.Sequelize.Op.in]: courseIds };
      }

      // Nếu instructor không có class/course nào và cũng không phải admin
      if (classIds.length === 0 && courseIds.length === 0 && req.user.role !== 'admin') {
        return res.status(200).json({
          success: true,
          data: {
            presentations: [],
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
          },
        });
      }

      const presentations = await Presentation.findAndCountAll({
        where: whereClause,
        include: [
          { model: User, as: 'student', attributes: ['userId', 'firstName', 'lastName', 'email'] },
          { model: Class, as: 'class', attributes: ['classId', 'classCode', 'className'] },
          { model: Course, as: 'course', attributes: ['courseId', 'courseCode', 'courseName'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return res.status(200).json({
        success: true,
        data: {
          presentations: presentations.rows,
          total: presentations.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    } catch (error) {
      console.error('Get pending approvals error:', error);
      return res.status(500).json({
        success: false,
        message: 'Thao tác thất bại',
        error: error.message,
      });
    }
  }

  // Lấy danh sách presentations đã duyệt
  async getApprovedPresentations(req, res) {
    try {
      const instructorId = req.user.userId;
      const { classId, courseId, limit = 50, offset = 0 } = req.query;

      const classIds = [];
      const courseIds = [];

      const directClasses = await Class.findAll({
        where: { instructorId: instructorId },
        attributes: ['classId'],
      });
      classIds.push(...directClasses.map(c => c.classId));

      const classInstructors = await db.ClassInstructor.findAll({
        where: { instructorId: instructorId },
        attributes: ['classId'],
      });
      classIds.push(...classInstructors.map(c => c.classId));

      const courseInstructors = await db.CourseInstructor.findAll({
        where: { instructorId: instructorId },
        attributes: ['courseId'],
      });
      courseIds.push(...courseInstructors.map(c => c.courseId));

      const { Presentation, User } = db;
      const whereClause = {
        instructorApproved: true,
      };

      if (classId) {
        whereClause.classId = parseInt(classId);
      } else if (classIds.length > 0) {
        whereClause.classId = { [db.Sequelize.Op.in]: classIds };
      }

      if (courseId) {
        whereClause.courseId = parseInt(courseId);
      } else if (courseIds.length > 0 && classIds.length === 0) {
        whereClause.courseId = { [db.Sequelize.Op.in]: courseIds };
      }

      if (classIds.length === 0 && courseIds.length === 0 && req.user.role !== 'admin') {
        return res.status(200).json({
          success: true,
          data: {
            presentations: [],
            total: 0,
          },
        });
      }

      const presentations = await Presentation.findAndCountAll({
        where: whereClause,
        include: [
          { model: User, as: 'student', attributes: ['userId', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['userId', 'firstName', 'lastName'] },
          { model: Class, as: 'class', attributes: ['classId', 'classCode', 'className'] },
          { model: Course, as: 'course', attributes: ['courseId', 'courseCode', 'courseName'] },
        ],
        order: [['approvedAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return res.status(200).json({
        success: true,
        data: {
          presentations: presentations.rows,
          total: presentations.count,
        },
      });
    } catch (error) {
      console.error('Get approved presentations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Thao tác thất bại',
        error: error.message,
      });
    }
  }
}

export default new InstructorController();
