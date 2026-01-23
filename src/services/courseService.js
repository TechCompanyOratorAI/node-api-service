import db from '../models/index.js';

const { Course, Topic, User, Presentation, Enrollment } = db;

class CourseService {
    // Create new course
    async createCourse(courseData, instructorId) {
        try {
            const { courseCode, courseName, description, semester, academicYear, startDate, endDate } = courseData;

            // Check if course code already exists for this instructor
            const existingCourse = await Course.findOne({
                where: {
                    courseCode,
                    instructorId,
                    isActive: true
                }
            });

            if (existingCourse) {
                return {
                    success: false,
                    message: 'Course code already exists for this instructor'
                };
            }

            const course = await Course.create({
                courseCode,
                courseName,
                description,
                instructorId,
                semester,
                academicYear,
                startDate,
                endDate,
                isActive: true
            });

            return {
                success: true,
                message: 'Course created successfully',
                course: {
                    courseId: course.courseId,
                    courseCode: course.courseCode,
                    courseName: course.courseName,
                    description: course.description,
                    semester: course.semester,
                    academicYear: course.academicYear,
                    startDate: course.startDate,
                    endDate: course.endDate,
                    isActive: course.isActive,
                    createdAt: course.createdAt
                }
            };
        } catch (error) {
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

            // Build where clause
            const where = {};
            if (instructorId) where.instructorId = instructorId;
            if (semester) where.semester = semester;
            if (academicYear) where.academicYear = academicYear;
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

            const { count, rows: courses } = await Course.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'instructor',
                        attributes: ['userId', 'username', 'firstName', 'lastName', 'email']
                    },
                    {
                        model: Topic,
                        as: 'topics',
                        attributes: ['topicId', 'topicName', 'sequenceNumber']
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

    // Get courses by instructor ID
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

            // Build where clause
            const where = {
                instructorId: instructorId
            };
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
                        as: 'instructor',
                        attributes: ['userId', 'username', 'firstName', 'lastName', 'email']
                    },
                    {
                        model: Topic,
                        as: 'topics',
                        attributes: ['topicId', 'topicName', 'sequenceNumber']
                    },
                    {
                        model: Enrollment,
                        as: 'enrollments',
                        attributes: ['enrollmentId', 'studentId'],
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
                data: courses.map(course => {
                    const courseData = course.toJSON();
                    // Remove enrollments array and add count instead
                    const enrollmentCount = courseData.enrollments?.length || 0;
                    delete courseData.enrollments;
                    return {
                        ...courseData,
                        enrollmentCount
                    };
                }),
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

    // Get course by ID
    async getCourseById(courseId, includeStats = false) {
        try {
            const includeOptions = [
                {
                    model: User,
                    as: 'instructor',
                    attributes: ['userId', 'username', 'firstName', 'lastName', 'email']
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

            const course = await Course.findByPk(courseId, {
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
                instructor: course.instructor,
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
    async updateCourse(courseId, courseData, userId) {
        try {
            const course = await Course.findByPk(courseId);

            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            // Check if user is the instructor
            if (course.instructorId !== userId) {
                return {
                    success: false,
                    message: 'You do not have permission to update this course'
                };
            }

            const { courseCode, courseName, description, semester, academicYear, startDate, endDate, isActive } = courseData;

            // If updating course code, check for duplicates
            if (courseCode && courseCode !== course.courseCode) {
                const existingCourse = await Course.findOne({
                    where: {
                        courseCode,
                        instructorId: userId,
                        courseId: { [db.Sequelize.Op.ne]: courseId },
                        isActive: true
                    }
                });

                if (existingCourse) {
                    return {
                        success: false,
                        message: 'Course code already exists'
                    };
                }
            }

            await course.update({
                courseCode: courseCode || course.courseCode,
                courseName: courseName || course.courseName,
                description: description !== undefined ? description : course.description,
                semester: semester || course.semester,
                academicYear: academicYear || course.academicYear,
                startDate: startDate || course.startDate,
                endDate: endDate || course.endDate,
                isActive: isActive !== undefined ? isActive : course.isActive
            });

            return {
                success: true,
                message: 'Course updated successfully',
                course: {
                    courseId: course.courseId,
                    courseCode: course.courseCode,
                    courseName: course.courseName,
                    description: course.description,
                    semester: course.semester,
                    academicYear: course.academicYear,
                    startDate: course.startDate,
                    endDate: course.endDate,
                    isActive: course.isActive,
                    updatedAt: course.updatedAt
                }
            };
        } catch (error) {
            console.error('Update course error:', error);
            return {
                success: false,
                message: 'Failed to update course',
                error: error.message
            };
        }
    }

    // Delete course (soft delete)
    async deleteCourse(courseId, userId) {
        try {
            const course = await Course.findByPk(courseId);

            if (!course) {
                return {
                    success: false,
                    message: 'Course not found'
                };
            }

            // Check if user is the instructor
            if (course.instructorId !== userId) {
                return {
                    success: false,
                    message: 'You do not have permission to delete this course'
                };
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

            // Check if user is the instructor
            if (course.instructorId !== userId) {
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
                        attributes: ['courseId', 'courseCode', 'courseName', 'instructorId'],
                        include: [
                            {
                                model: User,
                                as: 'instructor',
                                attributes: ['userId', 'username', 'firstName', 'lastName']
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
                    {
                        model: Course,
                        as: 'course',
                        attributes: ['instructorId']
                    }
                ]
            });

            if (!topic) {
                return {
                    success: false,
                    message: 'Topic not found'
                };
            }

            // Check if user is the course instructor
            if (topic.course.instructorId !== userId) {
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
                    {
                        model: Course,
                        as: 'course',
                        attributes: ['instructorId']
                    }
                ]
            });

            if (!topic) {
                return {
                    success: false,
                    message: 'Topic not found'
                };
            }

            // Check if user is the course instructor
            if (topic.course.instructorId !== userId) {
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
}

export default new CourseService();
