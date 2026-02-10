import db from '../models/index.js';

const { Course, Topic, User, Presentation, Enrollment, CourseInstructor } = db;

class CourseService {
    // Create new course (with multi-instructor support)
    async createCourse(courseData, createdBy) {
        const transaction = await db.sequelize.transaction();

        try {
            const {
                courseCode,
                courseName,
                departmentId,
                description,
                semester,
                academicYear,
                startDate,
                endDate,
                instructorIds = [] // Array of instructor IDs
            } = courseData;

            // Check if course code already exists
            const existingCourse = await Course.findOne({
                where: {
                    courseCode,
                    isActive: true
                }
            });

            if (existingCourse) {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Course code already exists'
                };
            }

            // Create course (no single instructorId FK)
            const course = await Course.create({
                courseCode,
                courseName,
                departmentId,
                description,
                semester,
                academicYear,
                startDate,
                endDate,
                isActive: true
            }, { transaction });

            // Assign instructors via course_instructors M:N table
            if (instructorIds && instructorIds.length > 0) {
                const assignments = instructorIds.map((instructorId) => ({
                    courseId: course.courseId,
                    instructorId,
                    assignedBy: createdBy
                }));

                await CourseInstructor.bulkCreate(assignments, { transaction });
            }

            await transaction.commit();

            // Fetch course with instructors
            const courseWithInstructors = await Course.findByPk(course.courseId, {
                include: [
                    {
                        model: User,
                        as: 'instructors',
                        attributes: ['userId', 'username', 'firstName', 'lastName', 'email'],
                        through: { attributes: ['assignedAt'] }
                    }
                ]
            });

            return {
                success: true,
                message: 'Course created successfully',
                course: courseWithInstructors
            };
        } catch (error) {
            await transaction.rollback();
            console.error('Create course error:', error);
            return {
                success: false,
                message: 'Failed to create course',
                error: error.message
            };
        }
    }

    // Get all courses (with filters and pagination)
    async getAllCourses(filters = {}, pagination = {}) {
        try {
            const {
                instructorId,
                departmentId,
                majorCode,
                semester,
                academicYear,
                isActive,
                search
            } = filters;

            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'DESC'
            } = pagination;

            const offset = (page - 1) * limit;

            // Build where clause for Course table
            const where = {};
            if (semester) where.semester = semester;
            if (academicYear) where.academicYear = academicYear;
            if (departmentId) where.departmentId = departmentId;
            if (majorCode) where.majorCode = majorCode;
            // Default to active courses only if not specified (for student access)
            if (isActive !== undefined) {
                where.isActive = isActive;
            } else {
                where.isActive = true;
            }

            // Search in course code or name
            if (search) {
                where[db.Sequelize.Op.or] = [
                    { courseCode: { [db.Sequelize.Op.like]: `%${search}%` } },
                    { courseName: { [db.Sequelize.Op.like]: `%${search}%` } }
                ];
            }

            // Build instructors include with optional filter
            const instructorsInclude = {
                model: User,
                as: 'instructors',
                attributes: ['userId', 'username', 'firstName', 'lastName', 'email'],
                through: { attributes: ['assignedAt', 'assignedBy'] },
                required: false
            };

            // If filtering by instructorId, add where clause to instructor join
            if (instructorId) {
                instructorsInclude.where = { userId: instructorId };
                instructorsInclude.required = true;
            }

            const { count, rows: courses } = await Course.findAndCountAll({
                where,
                include: [
                    instructorsInclude,
                    {
                        model: Topic,
                        as: 'topics',
                        attributes: ['topicId', 'topicName', 'sequenceNumber'],
                        required: false
                    }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [[sortBy, sortOrder]],
                distinct: true
            });

            return {
                success: true,
                data: courses,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Get all courses error:', error);
            return {
                success: false,
                message: 'Failed to retrieve courses',
                error: error.message
            };
        }
    }

    // Get courses by instructor ID (updated for M:N relationship)
    async getCoursesByInstructor(instructorId, filters = {}, pagination = {}) {
        try {
            // Verify instructor exists
            const instructor = await User.findByPk(instructorId);
            if (!instructor) {
                return {
                    success: false,
                    message: 'Instructor not found'
                };
            }

            const {
                semester,
                academicYear,
                isActive,
                search
            } = filters;

            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'DESC'
            } = pagination;

            const offset = (page - 1) * limit;

            // Build where clause for Course table
            const where = {};
            if (semester) where.semester = semester;
            if (academicYear) where.academicYear = academicYear;
            // Default to active courses only if not specified
            if (isActive !== undefined) {
                where.isActive = isActive;
            } else {
                where.isActive = true;
            }

            // Search in course code or name
            if (search) {
                where[db.Sequelize.Op.or] = [
                    { courseCode: { [db.Sequelize.Op.like]: `%${search}%` } },
                    { courseName: { [db.Sequelize.Op.like]: `%${search}%` } }
                ];
            }

            const { count, rows: courses } = await Course.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'instructors',
                        attributes: ['userId', 'username', 'firstName', 'lastName', 'email'],
                        through: { attributes: ['assignedAt', 'assignedBy'] },
                        where: { userId: instructorId }, // Filter by instructor ID in M:N
                        required: true
                    },
                    {
                        model: Topic,
                        as: 'topics',
                        attributes: ['topicId', 'topicName', 'sequenceNumber'],
                        required: false
                    }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [[sortBy, sortOrder]],
                distinct: true
            });

            return {
                success: true,
                instructor: {
                    userId: instructor.userId,
                    username: instructor.username,
                    firstName: instructor.firstName,
                    lastName: instructor.lastName,
                    email: instructor.email
                },
                data: courses.map(course => course.toJSON()),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Get courses by instructor error:', error);
            return {
                success: false,
                message: 'Failed to retrieve courses by instructor',
                error: error.message
            };
        }
    }

    // Get course by ID (updated for M:N instructors)
    async getCourseById(courseId, includeStats = false, isStudent = false) {
        try {
            const includeOptions = [
                {
                    model: User,
                    as: 'instructors',
                    attributes: ['userId', 'username', 'firstName', 'lastName', 'email'],
                    through: { attributes: ['assignedAt', 'assignedBy'] }
                },
                {
                    model: Topic,
                    as: 'topics',
                    attributes: ['topicId', 'topicName', 'description', 'sequenceNumber', 'dueDate', 'maxDurationMinutes'],
                    order: [['sequenceNumber', 'ASC']]
                }
            ];

            if (includeStats) {
                includeOptions.push(
                    {
                        model: Enrollment,
                        as: 'enrollments',
                        attributes: ['enrollmentId', 'studentId']
                    },
                    {
                        model: Presentation,
                        as: 'presentations',
                        attributes: ['presentationId', 'status']
                    }
                );
            }

            // Build where clause - students can only see active courses
            const where = { courseId };
            if (isStudent) {
                where.isActive = true;
            }

            const course = await Course.findOne({
                where,
                include: includeOptions
            });

            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            const courseData = {
                courseId: course.courseId,
                courseCode: course.courseCode,
                courseName: course.courseName,
                description: course.description,
                semester: course.semester,
                academicYear: course.academicYear,
                startDate: course.startDate,
                endDate: course.endDate,
                isActive: course.isActive,
                instructors: course.instructors, // Changed from instructor to instructors
                topics: course.topics,
                createdAt: course.createdAt,
                updatedAt: course.updatedAt
            };

            if (includeStats) {
                courseData.stats = {
                    totalEnrollments: course.enrollments?.length || 0,
                    totalPresentations: course.presentations?.length || 0,
                    totalTopics: course.topics?.length || 0
                };
            }

            return {
                success: true,
                course: courseData
            };
        } catch (error) {
            console.error('Get course by ID error:', error);
            return {
                success: false,
                message: 'Failed to retrieve course',
                error: error.message
            };
        }
    }

    // Update course
    async updateCourse(courseId, courseData, userId, userRole) {
        const transaction = await db.sequelize.transaction();

        try {
            const course = await Course.findByPk(courseId, { transaction });

            if (!course) {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            // Check if user is an instructor of this course (skip for Admin)
            if (userRole !== 'Admin') {
                const isInstructor = await CourseInstructor.findOne({
                    where: { courseId, instructorId: userId },
                    transaction
                });

                if (!isInstructor) {
                    await transaction.rollback();
                    return {
                        success: false,
                        message: 'You do not have permission to update this course'
                    };
                }
            }

            const {
                courseCode,
                courseName,
                description,
                semester,
                academicYear,
                startDate,
                endDate,
                isActive,
                instructorIds // Array of instructor IDs to update
            } = courseData;

            // If updating course code, check for duplicates
            if (courseCode && courseCode !== course.courseCode) {
                const existingCourse = await Course.findOne({
                    where: {
                        courseCode,
                        courseId: { [db.Sequelize.Op.ne]: courseId },
                        isActive: true
                    },
                    transaction
                });

                if (existingCourse) {
                    await transaction.rollback();
                    return {
                        success: false,
                        message: 'Course code already exists'
                    };
                }
            }

            // Update course basic info
            await course.update({
                courseCode: courseCode || course.courseCode,
                courseName: courseName || course.courseName,
                description: description !== undefined ? description : course.description,
                semester: semester || course.semester,
                academicYear: academicYear || course.academicYear,
                startDate: startDate || course.startDate,
                endDate: endDate || course.endDate,
                isActive: isActive !== undefined ? isActive : course.isActive
            }, { transaction });

            // Update instructors if instructorIds provided
            if (instructorIds && Array.isArray(instructorIds)) {
                // Remove existing instructor assignments
                await CourseInstructor.destroy({
                    where: { courseId },
                    transaction
                });

                // Add new instructor assignments
                if (instructorIds.length > 0) {
                    const assignments = instructorIds.map((instructorId) => ({
                        courseId: course.courseId,
                        instructorId,
                        assignedBy: userId
                    }));

                    await CourseInstructor.bulkCreate(assignments, { transaction });
                }
            }

            await transaction.commit();

            // Fetch updated course with instructors
            const updatedCourse = await Course.findByPk(courseId, {
                include: [
                    {
                        model: User,
                        as: 'instructors',
                        attributes: ['userId', 'username', 'firstName', 'lastName', 'email'],
                        through: { attributes: ['assignedAt'] }
                    }
                ]
            });

            return {
                success: true,
                message: 'Course updated successfully',
                course: updatedCourse
            };
        } catch (error) {
            await transaction.rollback();
            console.error('Update course error:', error);
            return {
                success: false,
                message: 'Failed to update course',
                error: error.message
            };
        }
    }

    // Delete course (soft delete)
    async deleteCourse(courseId, userId, userRole) {
        try {
            const course = await Course.findByPk(courseId);

            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            // Check if user is an instructor of this course (skip for Admin)
            if (userRole !== 'Admin') {
                const isInstructor = await CourseInstructor.findOne({
                    where: { courseId, instructorId: userId }
                });

                if (!isInstructor) {
                    return {
                        success: false,
                        message: 'You do not have permission to delete this course'
                    };
                }
            }

            // Check if course has presentations
            const presentationCount = await Presentation.count({
                where: { courseId }
            });

            if (presentationCount > 0) {
                // Soft delete
                await course.update({ isActive: false });
                return {
                    success: true,
                    message: 'Course deactivated successfully (has existing presentations)',
                    softDeleted: true
                };
            } else {
                // Hard delete if no presentations
                await course.destroy();
                return {
                    success: true,
                    message: 'Course deleted successfully',
                    softDeleted: false
                };
            }
        } catch (error) {
            console.error('Delete course error:', error);
            return {
                success: false,
                message: 'Failed to delete course',
                error: error.message
            };
        }
    }

    // Create topic for course
    async createTopic(courseId, topicData, userId) {
        try {
            const course = await Course.findByPk(courseId);

            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            // Check if user is an instructor of this course
            const isInstructor = await CourseInstructor.findOne({
                where: { courseId, instructorId: userId }
            });

            if (!isInstructor) {
                return {
                    success: false,
                    message: 'You do not have permission to create topics for this course'
                };
            }

            const { topicName, description, sequenceNumber, dueDate, maxDurationMinutes, requirements } = topicData;

            // Check if sequence number already exists
            if (sequenceNumber) {
                const existingTopic = await Topic.findOne({
                    where: {
                        courseId,
                        sequenceNumber
                    }
                });

                if (existingTopic) {
                    return {
                        success: false,
                        message: 'Sequence number already exists for this course'
                    };
                }
            }

            // If no sequence number provided, get the next one
            const nextSequence = sequenceNumber || (await Topic.max('sequenceNumber', { where: { courseId } }) || 0) + 1;

            const topic = await Topic.create({
                courseId,
                topicName,
                description,
                sequenceNumber: nextSequence,
                dueDate,
                maxDurationMinutes,
                requirements
            });

            return {
                success: true,
                message: 'Topic created successfully',
                topic: {
                    topicId: topic.topicId,
                    courseId: topic.courseId,
                    topicName: topic.topicName,
                    description: topic.description,
                    sequenceNumber: topic.sequenceNumber,
                    dueDate: topic.dueDate,
                    maxDurationMinutes: topic.maxDurationMinutes,
                    requirements: topic.requirements,
                    createdAt: topic.createdAt
                }
            };
        } catch (error) {
            console.error('Create topic error:', error);
            return {
                success: false,
                message: 'Failed to create topic',
                error: error.message
            };
        }
    }

    // Get all topics for a course
    async getTopicsByCourse(courseId) {
        try {
            const course = await Course.findByPk(courseId);

            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            const topics = await Topic.findAll({
                where: { courseId },
                include: [
                    {
                        model: Course,
                        as: 'course',
                        attributes: ['courseId', 'courseCode', 'courseName']
                    },
                    {
                        model: Presentation,
                        as: 'presentations',
                        attributes: ['presentationId', 'title', 'status']
                    }
                ],
                order: [['sequenceNumber', 'ASC']]
            });

            return {
                success: true,
                topics: topics.map(topic => ({
                    topicId: topic.topicId,
                    courseId: topic.courseId,
                    topicName: topic.topicName,
                    description: topic.description,
                    sequenceNumber: topic.sequenceNumber,
                    dueDate: topic.dueDate,
                    maxDurationMinutes: topic.maxDurationMinutes,
                    requirements: topic.requirements,
                    course: topic.course,
                    presentationCount: topic.presentations?.length || 0,
                    createdAt: topic.createdAt
                }))
            };
        } catch (error) {
            console.error('Get topics by course error:', error);
            return {
                success: false,
                message: 'Failed to retrieve topics',
                error: error.message
            };
        }
    }

    // Get topic by ID
    async getTopicById(topicId) {
        try {
            const topic = await Topic.findByPk(topicId, {
                include: [
                    {
                        model: Course,
                        as: 'course',
                        attributes: ['courseId', 'courseCode', 'courseName'],
                        include: [
                            {
                                model: User,
                                as: 'instructors',
                                attributes: ['userId', 'username', 'firstName', 'lastName'],
                                through: { attributes: [] }
                            }
                        ]
                    },
                    {
                        model: Presentation,
                        as: 'presentations',
                        attributes: ['presentationId', 'title', 'status', 'studentId', 'submissionDate']
                    }
                ]
            });

            if (!topic) {
                return {
                    success: false,
                    message: 'Topic not found'
                };
            }

            return {
                success: true,
                topic: {
                    topicId: topic.topicId,
                    courseId: topic.courseId,
                    topicName: topic.topicName,
                    description: topic.description,
                    sequenceNumber: topic.sequenceNumber,
                    dueDate: topic.dueDate,
                    maxDurationMinutes: topic.maxDurationMinutes,
                    requirements: topic.requirements,
                    course: topic.course,
                    presentations: topic.presentations,
                    createdAt: topic.createdAt,
                    updatedAt: topic.updatedAt
                }
            };
        } catch (error) {
            console.error('Get topic by ID error:', error);
            return {
                success: false,
                message: 'Failed to retrieve topic',
                error: error.message
            };
        }
    }

    // Update topic
    async updateTopic(topicId, topicData, userId) {
        try {
            const topic = await Topic.findByPk(topicId, {
                include: [
                    // No need to select course fields here since we use CourseInstructor for permission
                    {
                        model: Course,
                        as: 'course',
                        attributes: []
                    }
                ]
            });

            if (!topic) {
                return {
                    success: false,
                    message: 'Topic not found'
                };
            }

            // Check if user is an instructor of this course
            const isInstructor = await CourseInstructor.findOne({
                where: { courseId: topic.courseId, instructorId: userId }
            });

            if (!isInstructor) {
                return {
                    success: false,
                    message: 'You do not have permission to update this topic'
                };
            }

            const { topicName, description, sequenceNumber, dueDate, maxDurationMinutes, requirements } = topicData;

            // If updating sequence number, check for duplicates
            if (sequenceNumber && sequenceNumber !== topic.sequenceNumber) {
                const existingTopic = await Topic.findOne({
                    where: {
                        courseId: topic.courseId,
                        sequenceNumber,
                        topicId: { [db.Sequelize.Op.ne]: topicId }
                    }
                });

                if (existingTopic) {
                    return {
                        success: false,
                        message: 'Sequence number already exists for this course'
                    };
                }
            }

            await topic.update({
                topicName: topicName || topic.topicName,
                description: description !== undefined ? description : topic.description,
                sequenceNumber: sequenceNumber || topic.sequenceNumber,
                dueDate: dueDate !== undefined ? dueDate : topic.dueDate,
                maxDurationMinutes: maxDurationMinutes !== undefined ? maxDurationMinutes : topic.maxDurationMinutes,
                requirements: requirements !== undefined ? requirements : topic.requirements
            });

            return {
                success: true,
                message: 'Topic updated successfully',
                topic: {
                    topicId: topic.topicId,
                    courseId: topic.courseId,
                    topicName: topic.topicName,
                    description: topic.description,
                    sequenceNumber: topic.sequenceNumber,
                    dueDate: topic.dueDate,
                    maxDurationMinutes: topic.maxDurationMinutes,
                    requirements: topic.requirements,
                    updatedAt: topic.updatedAt
                }
            };
        } catch (error) {
            console.error('Update topic error:', error);
            return {
                success: false,
                message: 'Failed to update topic',
                error: error.message
            };
        }
    }

    // Delete topic
    async deleteTopic(topicId, userId) {
        try {
            const topic = await Topic.findByPk(topicId, {
                include: [
                    // Keep association for potential future use, but no columns needed
                    {
                        model: Course,
                        as: 'course',
                        attributes: []
                    }
                ]
            });

            if (!topic) {
                return {
                    success: false,
                    message: 'Topic not found'
                };
            }

            // Check if user is an instructor of this course via CourseInstructor M:N table
            const isInstructor = await CourseInstructor.findOne({
                where: { courseId: topic.courseId, instructorId: userId }
            });

            if (!isInstructor) {
                return {
                    success: false,
                    message: 'You do not have permission to delete this topic'
                };
            }

            // Check if topic has presentations
            const presentationCount = await Presentation.count({
                where: { topicId }
            });

            if (presentationCount > 0) {
                return {
                    success: false,
                    message: 'Cannot delete topic with existing presentations'
                };
            }

            await topic.destroy();

            return {
                success: true,
                message: 'Topic deleted successfully'
            };
        } catch (error) {
            console.error('Delete topic error:', error);
            return {
                success: false,
                message: 'Failed to delete topic',
                error: error.message
            };
        }
    }

    // ============================================================================
    // Course Instructor Management Methods (NEW)
    // ============================================================================

    /**
     * Add instructor to course
     * @param {number} courseId - Course ID
     * @param {number} instructorId - Instructor user ID
     * @param {number} assignedBy - User ID who assigned the instructor
     * @returns {Promise<object>} - Result object
     */
    async addCourseInstructor(courseId, instructorId, assignedBy) {
        try {
            // Check if course exists
            const course = await Course.findByPk(courseId);
            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            // Check if instructor user exists
            const instructor = await User.findByPk(instructorId);
            if (!instructor) {
                return {
                    success: false,
                    message: 'Instructor not found'
                };
            }

            // Check if already assigned
            const existing = await CourseInstructor.findOne({
                where: { courseId, instructorId }
            });

            if (existing) {
                return {
                    success: false,
                    message: 'Instructor already assigned to this course'
                };
            }

            // Create assignment
            await CourseInstructor.create({
                courseId,
                instructorId,
                assignedBy
            });

            return {
                success: true,
                message: 'Instructor assigned to course successfully'
            };
        } catch (error) {
            console.error('Add course instructor error:', error);
            return {
                success: false,
                message: 'Failed to assign instructor to course',
                error: error.message
            };
        }
    }

    /**
     * Remove instructor from course
     * @param {number} courseId - Course ID
     * @param {number} instructorId - Instructor user ID
     * @returns {Promise<object>} - Result object
     */
    async removeCourseInstructor(courseId, instructorId) {
        try {
            const assignment = await CourseInstructor.findOne({
                where: { courseId, instructorId }
            });

            if (!assignment) {
                return {
                    success: false,
                    message: 'Instructor not assigned to this course'
                };
            }

            await assignment.destroy();

            return {
                success: true,
                message: 'Instructor removed from course successfully'
            };
        } catch (error) {
            console.error('Remove course instructor error:', error);
            return {
                success: false,
                message: 'Failed to remove instructor from course',
                error: error.message
            };
        }
    }

    /**
     * Get all instructors for a course
     * @param {number} courseId - Course ID
     * @returns {Promise<object>} - Result with instructors list
     */
    async getCourseInstructors(courseId) {
        try {
            const course = await Course.findByPk(courseId, {
                include: [
                    {
                        model: User,
                        as: 'instructors',
                        attributes: ['userId', 'username', 'firstName', 'lastName', 'email', 'departmentId'],
                        through: {
                            attributes: ['assignedAt']
                        }
                    }
                ]
            });

            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            return {
                success: true,
                data: course.instructors
            };
        } catch (error) {
            console.error('Get course instructors error:', error);
            return {
                success: false,
                message: 'Failed to get course instructors',
                error: error.message
            };
        }
    }

    /**
     * Get available instructors for a course (same major)
     * @param {number} courseId - Course ID
     * @param {object} filters - Filter options { search }
     * @returns {Promise<object>} - Result with instructors list
     */
    async getAvailableInstructors(courseId, filters = {}) {
        try {
            // Get course to find its department
            const course = await Course.findByPk(courseId);
            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            const { search } = filters;

            // Build where clause for instructors
            const where = {
                isActive: true
            };

            // Filter by course department if exists
            // If course has departmentId, only show instructors with same departmentId
            if (course.departmentId) {
                where.departmentId = course.departmentId;
            }
            // If course has no departmentId but has majorCode, fallback to majorCode matching
            else if (course.majorCode) {
                where.studyMajor = { [db.Sequelize.Op.like]: `%${course.majorCode}%` };
            }

            // Search filter
            if (search) {
                where[db.Sequelize.Op.or] = [
                    { username: { [db.Sequelize.Op.like]: `%${search}%` } },
                    { firstName: { [db.Sequelize.Op.like]: `%${search}%` } },
                    { lastName: { [db.Sequelize.Op.like]: `%${search}%` } },
                    { email: { [db.Sequelize.Op.like]: `%${search}%` } }
                ];
            }

            // Get instructors with Instructor role
            const instructors = await User.findAll({
                where,
                attributes: ['userId', 'username', 'firstName', 'lastName', 'email', 'departmentId', 'studyMajor'],
                include: [{
                    association: 'userRoles',
                    include: [{
                        association: 'role',
                        where: { roleName: 'Instructor' }
                    }]
                }],
                order: [['lastName', 'ASC'], ['firstName', 'ASC']]
            });

            // Get already assigned instructors
            const assignedInstructors = await CourseInstructor.findAll({
                where: { courseId },
                attributes: ['instructorId']
            });

            const assignedIds = assignedInstructors.map(ci => ci.instructorId);

            // Filter out already assigned instructors (only show available ones)
            const availableInstructors = instructors.filter(instructor =>
                !assignedIds.includes(instructor.userId)
            );

            const instructorsList = availableInstructors.map(instructor => ({
                userId: instructor.userId,
                username: instructor.username,
                firstName: instructor.firstName,
                lastName: instructor.lastName,
                email: instructor.email,
                departmentId: instructor.departmentId,
                studyMajor: instructor.studyMajor
            }));

            return {
                success: true,
                data: instructorsList,
                count: instructorsList.length,
                departmentId: course.departmentId,
                majorCode: course.majorCode,
                totalInstructors: instructors.length,
                alreadyAssigned: assignedIds.length
            };

        } catch (error) {
            console.error('Get available instructors error:', error);
            return {
                success: false,
                message: 'Failed to get available instructors',
                error: error.message
            };
        }
    }
}

export default new CourseService();