import db from '../models/index.js';
const { ClassInstructor, CourseInstructor, Class, Enrollment } = db;

/**
 * Check if user is instructor of class
 * Middleware to verify that the authenticated user is assigned as an instructor to the specified class.
 * 
 * Usage: Apply to routes that require class instructor privileges
 * Example: POST /classes/:classId/enroll-key
 * 
 * Prerequisites: 
 * - authenticateToken middleware must run first to populate req.user
 * - Admin users bypass this check (see requireRole(['Admin']) in routes)
 * 
 * @param {Object} req - Express request object (expects req.params.classId and req.user.userId)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requireClassInstructor = async (req, res, next) => {
    const { classId } = req.params;
    const userId = req.user?.userId;
    const userRoles = req.userRoles || [];

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Xác thực là bắt buộc'
        });
    }

    if (!classId) {
        return res.status(400).json({
            success: false,
            message: 'ID lớp học là bắt buộc'
        });
    }

    try {
        // Admin bypass - Admin has full access to all classes
        if (userRoles.includes('Admin')) {
            return next();
        }

        const isInstructor = await ClassInstructor.findOne({
            where: {
                classId: parseInt(classId),
                instructorId: userId
            }
        });

        if (!isInstructor) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không được phân công giảng dạy lớp học này'
            });
        }

        next();
    } catch (error) {
        console.error('Class auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra quyền truy cập',
            error: error.message
        });
    }
};

/**
 * Check if user is instructor of course (for class creation)
 * Middleware to verify that the authenticated user is assigned as an instructor to the course.
 * Used when creating classes within a course - instructor must be assigned to parent course.
 * 
 * Usage: Apply to routes that require course instructor privileges
 * Example: POST /courses/:courseId/classes
 * 
 * Prerequisites:
 * - authenticateToken middleware must run first
 * - Admin users bypass this check
 * 
 * @param {Object} req - Express request object (expects courseId in req.body or req.params)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requireCourseInstructor = async (req, res, next) => {
    const courseId = req.body?.courseId || req.params?.courseId;
    const userId = req.user?.userId;
    const userRoles = req.userRoles || [];

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Xác thực là bắt buộc'
        });
    }

    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: 'ID khóa học là bắt buộc'
        });
    }

    try {
        // Admin bypass - Admin has full access to all courses
        if (userRoles.includes('Admin')) {
            return next();
        }

        const isInstructor = await CourseInstructor.findOne({
            where: {
                courseId: parseInt(courseId),
                instructorId: userId
            }
        });

        if (!isInstructor) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không được phân công giảng dạy khóa học này'
            });
        }

        next();
    } catch (error) {
        console.error('Course auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra quyền truy cập',
            error: error.message
        });
    }
};

/**
 * Check if student is enrolled in class (for presentation submission)
 * Middleware to verify that the authenticated student is actively enrolled in the specified class.
 * Used when students attempt to create presentations or access class-specific resources.
 * 
 * Usage: Apply to routes that require active class enrollment
 * Example: POST /presentations (when creating presentation for a class)
 * 
 * Prerequisites:
 * - authenticateToken middleware must run first
 * - requireRole(['Student']) should run before this for role validation
 * 
 * @param {Object} req - Express request object (expects classId in req.body or req.params)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requireClassEnrollment = async (req, res, next) => {
    const classId = req.body?.classId || req.params?.classId;
    const studentId = req.user?.userId;

    if (!studentId) {
        return res.status(401).json({
            success: false,
            message: 'Xác thực là bắt buộc'
        });
    }

    if (!classId) {
        return res.status(400).json({
            success: false,
            message: 'ID lớp học là bắt buộc'
        });
    }

    try {
        const enrollment = await Enrollment.findOne({
            where: {
                classId: parseInt(classId),
                studentId,
                status: 'enrolled'
            }
        });

        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chưa tham gia lớp học này hoặc đã rời khỏi lớp'
            });
        }

        next();
    } catch (error) {
        console.error('Enrollment check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra trạng thái tham gia lớp',
            error: error.message
        });
    }
};

/**
 * Optional: Check if user is either instructor of class OR admin
 * Combines class instructor check with admin bypass logic.
 * Useful for routes that should be accessible to both class instructors and admins.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requireClassInstructorOrAdmin = async (req, res, next) => {
    const { classId } = req.params;
    const userId = req.user?.userId;
    const userRoles = req.userRoles || [];

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Xác thực là bắt buộc'
        });
    }

    // Admin bypass
    if (userRoles.includes('Admin')) {
        return next();
    }

    if (!classId) {
        return res.status(400).json({
            success: false,
            message: 'ID lớp học là bắt buộc'
        });
    }

    try {
        const isInstructor = await ClassInstructor.findOne({
            where: {
                classId: parseInt(classId),
                instructorId: userId
            }
        });

        if (!isInstructor) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập lớp học này'
            });
        }

        next();
    } catch (error) {
        console.error('Class instructor or admin check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra quyền truy cập',
            error: error.message
        });
    }
};

export default {
    requireClassInstructor,
    requireCourseInstructor,
    requireClassEnrollment,
    requireClassInstructorOrAdmin
};
