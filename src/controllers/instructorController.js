import db from '../models/index.js';

const { Presentation, User, Class, Course } = db;

class InstructorController {
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
          message: 'presentationId must be a number',
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
          message: 'Presentation not found',
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
          message: 'Presentation is already approved',
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
        message: 'Presentation approved for submission',
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
        message: 'Failed to approve submission',
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
          message: 'presentationId must be a number',
        });
      }

      const presentation = await Presentation.findByPk(parsedPresentationId);

      if (!presentation) {
        return res.status(404).json({
          success: false,
          message: 'Presentation not found',
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
          message: 'Presentation is not approved yet',
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
        message: 'Approval revoked',
        data: {
          presentationId: parsedPresentationId,
          instructorApproved: false,
        },
      });
    } catch (error) {
      console.error('Unapprove submission error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to revoke approval',
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
          message: 'presentationId must be a number',
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
          message: 'Presentation not found',
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
        message: 'Failed to get approval status',
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
        message: 'Failed to get pending approvals',
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
        message: 'Failed to get approved presentations',
        error: error.message,
      });
    }
  }
}

export default new InstructorController();
