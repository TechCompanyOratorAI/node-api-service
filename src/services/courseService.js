import db from '../models/index.js';

const { Course, Topic, User, Presentation, Enrollment, CourseInstructor, Class, TopicEnrollment, Group, AcademicBlock, AcademicYear, CourseAcademicBlock, SubjectArea, CourseSubjectArea } = db;

class CourseService {
    normalizeAcademicBlockIds(courseData = {}) {
        const { academicBlockIds, academicBlockId } = courseData;
        if (Array.isArray(academicBlockIds)) {
            return [...new Set(academicBlockIds.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0))];
        }
        if (academicBlockId !== undefined && academicBlockId !== null) {
            const parsed = parseInt(academicBlockId, 10);
            return Number.isInteger(parsed) && parsed > 0 ? [parsed] : [];
        }
        return [];
    }

    normalizeSubjectAreaIds(courseData = {}) {
        const { subjectAreaIds, subjectAreaId } = courseData;
        if (Array.isArray(subjectAreaIds)) {
            return [...new Set(subjectAreaIds.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0))];
        }
        if (subjectAreaId !== undefined && subjectAreaId !== null) {
            const parsed = parseInt(subjectAreaId, 10);
            return Number.isInteger(parsed) && parsed > 0 ? [parsed] : [];
        }
        return [];
    }

    async resolveSubjectAreas(subjectAreaIds, transaction) {
        if (!subjectAreaIds.length) return { success: true, subjectAreas: [] };
        const subjectAreas = await SubjectArea.findAll({
            where: {
                subjectAreaId: subjectAreaIds,
                isActive: true,
            },
            transaction,
        });
        if (subjectAreas.length !== subjectAreaIds.length) {
            return { success: false, message: "Dữ liệu không hợp lệ" };
        }
        return { success: true, subjectAreas };
    }

    async syncCourseSubjectAreas(courseId, subjectAreaIds, transaction) {
        await CourseSubjectArea.destroy({
            where: { courseId },
            transaction,
        });
        if (!subjectAreaIds.length) return;
        await CourseSubjectArea.bulkCreate(
            subjectAreaIds.map((id, index) => ({
                courseId,
                subjectAreaId: id,
                isPrimary: index === 0,
            })),
            { transaction }
        );
    }

    async resolveCourseBlocks(academicBlockIds, transaction) {
        if (!academicBlockIds.length) {
            return { success: true, blocks: [] };
        }

        const blocks = await AcademicBlock.findAll({
            where: {
                academicBlockId: academicBlockIds,
                isActive: true,
            },
            include: [{ model: AcademicYear, as: "academicYear" }],
            transaction,
        });

        if (blocks.length !== academicBlockIds.length) {
            return {
                success: false,
                message: "Dữ liệu không hợp lệ",
            };
        }

        return { success: true, blocks };
    }

    validateCourseDateWithinBlocks(startDate, endDate, blocks) {
        if (!blocks.length) {
            return { success: true };
        }

        const minStart = blocks.reduce((acc, block) => {
            if (!acc) return block.startDate;
            return new Date(block.startDate) < new Date(acc) ? block.startDate : acc;
        }, null);
        const maxEnd = blocks.reduce((acc, block) => {
            if (!acc) return block.endDate;
            return new Date(block.endDate) > new Date(acc) ? block.endDate : acc;
        }, null);

        const actualStart = startDate || minStart;
        const actualEnd = endDate || maxEnd;

        if (new Date(actualStart) >= new Date(actualEnd)) {
            return { success: false, message: "Ngày kết thúc phải sau ngày bắt đầu" };
        }
        if (new Date(actualStart) < new Date(minStart) || new Date(actualEnd) > new Date(maxEnd)) {
            return {
                success: false,
                message: "Ngày bắt đầu/kết thúc phải nằm trong phạm vi kỳ học đã chọn",
            };
        }

        return {
            success: true,
            startDate: actualStart,
            endDate: actualEnd,
            primaryAcademicBlockId: blocks[0]?.academicBlockId || null,
        };
    }

    async syncCourseAcademicBlocks(courseId, academicBlockIds, transaction) {
        await CourseAcademicBlock.destroy({
            where: { courseId },
            transaction,
        });

        if (!academicBlockIds.length) return;

        await CourseAcademicBlock.bulkCreate(
            academicBlockIds.map((blockId, index) => ({
                courseId,
                academicBlockId: blockId,
                isPrimary: index === 0,
            })),
            { transaction }
        );
    }

    buildAcademicBlocksInclude(required = false, where = null) {
        return {
            model: AcademicBlock,
            as: "academicBlocks",
            attributes: [
                "academicBlockId",
                "blockCode",
                "term",
                "half",
                "blockType",
                "startDate",
                "endDate",
                "isActive",
            ],
            through: { attributes: ["isPrimary"] },
            include: [{ model: AcademicYear, as: "academicYear" }],
            required,
            ...(where ? { where } : {}),
        };
    }

    formatCourseBlocks(course) {
        const blocks = course.academicBlocks || [];
        const primary = blocks.find((b) => b.CourseAcademicBlock?.isPrimary) || blocks[0] || null;
        return {
            academicBlocks: blocks,
            primaryAcademicBlockId: primary?.academicBlockId || null,
        };
    }

    // Create new course (with multi-instructor support)
    async createCourse(courseData, createdBy) {
        const transaction = await db.sequelize.transaction();

        try {
            const {
                courseCode,
                courseName,
                departmentId,
                subjectAreaId,
                description,
                semester,
                academicYear,
                startDate,
                endDate,
                instructorIds = [] // Array of instructor IDs
            } = courseData;
            const academicBlockIds = this.normalizeAcademicBlockIds(courseData);
            const subjectAreaIds = this.normalizeSubjectAreaIds(courseData);

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
                    message: 'Mã môn học đã tồn tại'
                };
            }

            const resolvedBlocks = await this.resolveCourseBlocks(academicBlockIds, transaction);
            if (!resolvedBlocks.success) {
                await transaction.rollback();
                return resolvedBlocks;
            }

            const dateValidation = this.validateCourseDateWithinBlocks(startDate, endDate, resolvedBlocks.blocks);
            if (!dateValidation.success) {
                await transaction.rollback();
                return dateValidation;
            }

            const resolvedSubjectAreas = await this.resolveSubjectAreas(subjectAreaIds, transaction);
            if (!resolvedSubjectAreas.success) {
                await transaction.rollback();
                return resolvedSubjectAreas;
            }
            const primarySubjectAreaId =
                subjectAreaIds[0] || (subjectAreaId ? parseInt(subjectAreaId, 10) : null) || null;

            // Create course (no single instructorId FK)
            const course = await Course.create({
                courseCode,
                courseName,
                departmentId,
                subjectAreaId: primarySubjectAreaId,
                description,
                academicBlockId: dateValidation.primaryAcademicBlockId,
                semester,
                academicYear,
                startDate: dateValidation.startDate || null,
                endDate: dateValidation.endDate || null,
                isActive: true
            }, { transaction });

            await this.syncCourseAcademicBlocks(course.courseId, academicBlockIds, transaction);
            await this.syncCourseSubjectAreas(course.courseId, subjectAreaIds, transaction);

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
                    },
                    {
                        model: SubjectArea,
                        as: 'subjectAreas',
                        through: { attributes: ['isPrimary'] },
                        required: false
                    },
                    {
                        ...this.buildAcademicBlocksInclude(false)
                    }
                ]
            });

            return {
                success: true,
                message: 'Môn học đã tạo thành công',
                course: courseWithInstructors
            };
        } catch (error) {
            await transaction.rollback();
            console.error('Create course error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
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
                subjectAreaId,
                academicBlockId,
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
    if (subjectAreaId) where.subjectAreaId = subjectAreaId;
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
            },
            {
                model: SubjectArea,
                as: "subjectArea",
                attributes: ["subjectAreaId", "subjectCode", "subjectName", "departmentId", "majorId"],
                required: false,
            },
            {
                model: SubjectArea,
                as: "subjectAreas",
                attributes: ["subjectAreaId", "subjectCode", "subjectName", "departmentId", "majorId"],
                through: { attributes: ["isPrimary"] },
                required: false,
            },
            this.buildAcademicBlocksInclude(!!academicBlockId, academicBlockId ? { academicBlockId } : null)
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder]],
        distinct: true
    });

    // Count active classes per course (status=active AND endDate >= today)
    const now = new Date();
    const courseIds = courses.map(c => c.courseId);
    const activeClassCounts = {};
    if (courseIds.length > 0) {
        const activeClasses = await Class.findAll({
            attributes: [
                'courseId',
                [db.sequelize.fn('COUNT', db.sequelize.col('classId')), 'activeCount']
            ],
            where: {
                courseId: courseIds,
                status: 'active',
                endDate: { [db.Sequelize.Op.gte]: now }
            },
            group: ['courseId']
        });
        activeClasses.forEach(c => {
            activeClassCounts[c.courseId] = parseInt(c.get('activeCount'), 10);
        });
    }

    const coursesWithStats = courses.map(course => {
        const json = course.toJSON();
        const primary = json.academicBlocks?.find((b) => b.CourseAcademicBlock?.isPrimary) || json.academicBlocks?.[0] || null;
        json.academicBlockId = primary?.academicBlockId || null;
        json.totalActiveClasses = activeClassCounts[course.courseId] || 0;
        return json;
    });

    return {
        success: true,
        data: coursesWithStats,
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
                message: 'Thao tác thất bại',
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
                    message: 'Không tìm thấy giảng viên'
                };
            }

            const {
                semester,
                academicYear,
                academicBlockId,
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
                    },
                    {
                        model: SubjectArea,
                        as: "subjectArea",
                        attributes: ["subjectAreaId", "subjectCode", "subjectName", "departmentId", "majorId"],
                        required: false,
                    },
                    {
                        model: SubjectArea,
                        as: "subjectAreas",
                        attributes: ["subjectAreaId", "subjectCode", "subjectName", "departmentId", "majorId"],
                        through: { attributes: ["isPrimary"] },
                        required: false,
                    },
                    this.buildAcademicBlocksInclude(!!academicBlockId, academicBlockId ? { academicBlockId } : null)
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
                    const json = course.toJSON();
                    const primary = json.academicBlocks?.find((b) => b.CourseAcademicBlock?.isPrimary) || json.academicBlocks?.[0] || null;
                    json.academicBlockId = primary?.academicBlockId || null;
                    return json;
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
                message: 'Thao tác thất bại',
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
                },
                {
                    model: SubjectArea,
                    as: "subjectArea",
                    attributes: ["subjectAreaId", "subjectCode", "subjectName", "departmentId", "majorId"],
                    required: false,
                },
                {
                    model: SubjectArea,
                    as: "subjectAreas",
                    attributes: ["subjectAreaId", "subjectCode", "subjectName", "departmentId", "majorId"],
                    through: { attributes: ["isPrimary"] },
                    required: false,
                },
                {
                    ...this.buildAcademicBlocksInclude(false)
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
                    message: 'Môn học không tìm thấy'
                };
            }

            const { academicBlocks, primaryAcademicBlockId } = this.formatCourseBlocks(course);
            const courseData = {
                courseId: course.courseId,
                courseCode: course.courseCode,
                courseName: course.courseName,
                description: course.description,
                subjectAreaId: course.subjectAreaId,
                subjectArea: course.subjectArea,
                subjectAreaIds: (course.subjectAreas || []).map((item) => item.subjectAreaId),
                subjectAreas: course.subjectAreas || [],
                semester: course.semester,
                academicYear: course.academicYear,
                academicBlockId: primaryAcademicBlockId,
                academicBlocks,
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
                message: 'Thao tác thất bại',
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
                    message: 'Môn học không tìm thấy'
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
                        message: 'Bạn không có quyền cập nhật môn học này'
                    };
                }
            }

            const {
                courseCode,
                courseName,
                description,
                academicBlockId,
                academicBlockIds,
                semester,
                academicYear,
                startDate,
                endDate,
                isActive,
                departmentId,
                subjectAreaId,
                subjectAreaIds,
                instructorIds // Array of instructor IDs để cập nhật
            } = courseData;
            const hasAcademicBlocksInPayload = Array.isArray(academicBlockIds) || academicBlockId !== undefined;

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
                        message: 'Mã môn học đã tồn tại'
                    };
                }
            }

            const existingMappings = await CourseAcademicBlock.findAll({
                where: { courseId },
                attributes: ["academicBlockId", "isPrimary"],
                order: [["isPrimary", "DESC"], ["courseAcademicBlockId", "ASC"]],
                transaction,
            });

            const nextAcademicBlockIds = hasAcademicBlocksInPayload
                ? this.normalizeAcademicBlockIds({ academicBlockIds, academicBlockId })
                : existingMappings.map((mapping) => mapping.academicBlockId);
            const hasSubjectAreasInPayload = Array.isArray(subjectAreaIds) || subjectAreaId !== undefined;
            const existingSubjectAreaMappings = await CourseSubjectArea.findAll({
                where: { courseId },
                attributes: ["subjectAreaId", "isPrimary"],
                order: [["isPrimary", "DESC"], ["courseSubjectAreaId", "ASC"]],
                transaction,
            });
            const nextSubjectAreaIds = hasSubjectAreasInPayload
                ? this.normalizeSubjectAreaIds({ subjectAreaIds, subjectAreaId })
                : existingSubjectAreaMappings.map((mapping) => mapping.subjectAreaId);
            const resolvedBlocks = await this.resolveCourseBlocks(nextAcademicBlockIds, transaction);
            if (!resolvedBlocks.success) {
                await transaction.rollback();
                return resolvedBlocks;
            }

            const nextStartDate =
                startDate !== undefined
                    ? startDate
                    : hasAcademicBlocksInPayload
                        ? null
                        : course.startDate;
            const nextEndDate =
                endDate !== undefined
                    ? endDate
                    : hasAcademicBlocksInPayload
                        ? null
                        : course.endDate;
            const dateValidation = this.validateCourseDateWithinBlocks(nextStartDate, nextEndDate, resolvedBlocks.blocks);
            if (!dateValidation.success) {
                await transaction.rollback();
                return dateValidation;
            }
            const resolvedSubjectAreas = await this.resolveSubjectAreas(nextSubjectAreaIds, transaction);
            if (!resolvedSubjectAreas.success) {
                await transaction.rollback();
                return resolvedSubjectAreas;
            }
            const nextPrimarySubjectAreaId = nextSubjectAreaIds[0] || null;

            await course.update({
                courseCode: courseCode || course.courseCode,
                courseName: courseName || course.courseName,
                description: description !== undefined ? description : course.description,
                academicBlockId: dateValidation.primaryAcademicBlockId,
                semester: semester || course.semester,
                academicYear: academicYear || course.academicYear,
                startDate: dateValidation.startDate || null,
                endDate: dateValidation.endDate || null,
                isActive: isActive !== undefined ? isActive : course.isActive,
                departmentId: departmentId !== undefined ? departmentId : course.departmentId,
                subjectAreaId: hasSubjectAreasInPayload ? nextPrimarySubjectAreaId : course.subjectAreaId,
            }, { transaction });

            if (hasAcademicBlocksInPayload) {
                await this.syncCourseAcademicBlocks(courseId, nextAcademicBlockIds, transaction);
            }
            if (hasSubjectAreasInPayload) {
                await this.syncCourseSubjectAreas(courseId, nextSubjectAreaIds, transaction);
            }

            // Update instructors if instructorIds provided
            if (instructorIds !== undefined && Array.isArray(instructorIds)) {
                // Validate: Cannot remove all instructors from active course
                if (instructorIds.length === 0 && course.isActive) {
                    await transaction.rollback();
                    return {
                        success: false,
                        message: 'Thao tác thất bại'
                    };
                }

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
                    },
                    {
                        model: SubjectArea,
                        as: 'subjectAreas',
                        through: { attributes: ['isPrimary'] },
                        required: false
                    },
                    {
                        ...this.buildAcademicBlocksInclude(false)
                    }
                ]
            });

            return {
                success: true,
                message: 'Môn học đã cập nhật thành công',
                course: updatedCourse
            };
        } catch (error) {
            await transaction.rollback();
            console.error('Update course error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
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
                    message: 'Môn học không tìm thấy'
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
                        message: 'Bạn không có quyền xóa môn học này'
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
                    message: 'Môn học đã được lưu trữ do đã có dữ liệu trình bày',
                    softDeleted: true
                };
            } else {
                // Hard delete if no presentations
                await course.destroy();
                return {
                    success: true,
                    message: 'Môn học đã xóa thành công',
                    softDeleted: false
                };
            }
        } catch (error) {
            console.error('Delete course error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
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
                    message: 'Môn học không tìm thấy'
                };
            }

            // Check if user is an instructor of this course
            const isInstructor = await CourseInstructor.findOne({
                where: { courseId, instructorId: userId }
            });

            if (!isInstructor) {
                return {
                    success: false,
                    message: 'Bạn không có quyền tạo topic cho môn học này'
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
                        message: 'Số thứ tự topic đã tồn tại trong môn học'
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
                message: 'Chủ đề đã tạo thành công',
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
                message: 'Thao tác thất bại',
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
                    message: 'Môn học không tìm thấy'
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
                message: 'Thao tác thất bại',
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
                        attributes: ['presentationId', 'title', 'status', 'studentId', 'submissionDate', 'groupCode'],
                        include: [
                            {
                                model: User,
                                as: 'student',
                                attributes: ['userId', 'firstName', 'lastName', 'email']
                            }
                        ]
                    }
                ]
            });

            if (!topic) {
                return {
                    success: false,
                    message: 'Chủ đề không tìm thấy'
                };
            }

            // Flatten group info into each presentation for easier consumption
            const presentationsWithGroup = await Promise.all(
                (topic.presentations || []).map(async (p) => {
                    let groupName = null;

                    // Try to get group name via TopicEnrollment → Group
                    if (p.studentId) {
                        const enrollment = await TopicEnrollment.findOne({
                            where: {
                                topicId: topic.topicId,
                                studentId: p.studentId,
                                status: 'enrolled'
                            },
                            include: [
                                {
                                    model: Group,
                                    as: 'group',
                                    attributes: ['groupId', 'groupName']
                                }
                            ]
                        });
                        if (enrollment && enrollment.group) {
                            groupName = enrollment.group.groupName;
                        }
                    }

                    return {
                        presentationId: p.presentationId,
                        title: p.title,
                        status: p.status,
                        studentId: p.studentId,
                        groupCode: p.groupCode,
                        submissionDate: p.submissionDate,
                        student: p.student,
                        groupName
                    };
                })
            );

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
                    presentations: presentationsWithGroup,
                    createdAt: topic.createdAt,
                    updatedAt: topic.updatedAt
                }
            };
        } catch (error) {
            console.error('Get topic by ID error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
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
                    message: 'Chủ đề không tìm thấy'
                };
            }

            // Check if user is an instructor of this course
            const isInstructor = await CourseInstructor.findOne({
                where: { courseId: topic.courseId, instructorId: userId }
            });

            if (!isInstructor) {
                return {
                    success: false,
                    message: 'Bạn không có quyền cập nhật topic của môn học này'
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
                        message: 'Số thứ tự topic đã tồn tại trong môn học'
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
                message: 'Chủ đề đã cập nhật thành công',
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
                message: 'Thao tác thất bại',
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
                    message: 'Chủ đề không tìm thấy'
                };
            }

            // Check if user is an instructor of this course via CourseInstructor M:N table
            const isInstructor = await CourseInstructor.findOne({
                where: { courseId: topic.courseId, instructorId: userId }
            });

            if (!isInstructor) {
                return {
                    success: false,
                    message: 'Bạn không có quyền xóa topic của môn học này'
                };
            }

            // Check if topic has presentations
            const presentationCount = await Presentation.count({
                where: { topicId }
            });

            if (presentationCount > 0) {
                return {
                    success: false,
                    message: 'Thao tác thất bại'
                };
            }

            await topic.destroy();

            return {
                success: true,
                message: 'Chủ đề đã xóa thành công'
            };
        } catch (error) {
            console.error('Delete topic error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
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
                    message: 'Môn học không tìm thấy'
                };
            }

            // Check if instructor user exists
            const instructor = await User.findByPk(instructorId);
            if (!instructor) {
                return {
                    success: false,
                    message: 'Không tìm thấy giảng viên'
                };
            }

            // Check if already assigned
            const existing = await CourseInstructor.findOne({
                where: { courseId, instructorId }
            });

            if (existing) {
                return {
                    success: false,
                    message: 'Giảng viên đã được phân công vào môn học này'
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
                message: 'Đã phân công giảng viên vào môn học thành công'
            };
        } catch (error) {
            console.error('Add course instructor error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
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
                    message: 'Không tìm thấy phân công giảng viên trong môn học'
                };
            }

            await assignment.destroy();

            return {
                success: true,
                message: 'Đã gỡ giảng viên khỏi môn học thành công'
            };
        } catch (error) {
            console.error('Remove course instructor error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
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
                    message: 'Môn học không tìm thấy'
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
                message: 'Thao tác thất bại',
                error: error.message
            };
        }
    }

    /**
     * Get available instructors for a course (same department)
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
                    message: 'Môn học không tìm thấy'
                };
            }

            const { search } = filters;

            // Build where clause for instructors
            const where = {
                isActive: true
            };

            // Filter by course department if exists
            if (course.departmentId) {
                where.departmentId = course.departmentId;
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
                totalInstructors: instructors.length,
                alreadyAssigned: assignedIds.length
            };

        } catch (error) {
            console.error('Get available instructors error:', error);
            return {
                success: false,
                message: 'Thao tác thất bại',
                error: error.message
            };
        }
    }
}

export default new CourseService();
