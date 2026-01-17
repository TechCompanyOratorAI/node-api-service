import db from '../models/index.js';

const { Course, Topic, Enrollment, TopicEnrollment, User } = db;

class EnrollmentService {
    async enrollCourse(courseId, studentId) {
        try {
            const course = await Course.findByPk(courseId);
            if (!course || !course.isActive) {
                return { success: false, message: 'Course not found or inactive' };
            }

            const existing = await Enrollment.findOne({
                where: { courseId, studentId }
            });

            if (existing) {
                if (existing.status === 'enrolled') {
                    return { success: false, message: 'Already enrolled in this course' };
                }

                await Enrollment.update(
                    { status: 'enrolled', enrolledAt: new Date() },
                    { where: { enrollmentId: existing.enrollmentId } }
                );

                return { success: true, message: 'Re-enrolled in course', enrollmentId: existing.enrollmentId };
            }

            const enrollment = await Enrollment.create({
                courseId,
                studentId,
                status: 'enrolled'
            });

            return { success: true, message: 'Enrolled in course', enrollmentId: enrollment.enrollmentId };
        } catch (error) {
            console.error('Enroll course error:', error);
            return { success: false, message: 'Failed to enroll in course', error: error.message };
        }
    }

    async dropCourse(courseId, studentId) {
        try {
            const existing = await Enrollment.findOne({
                where: { courseId, studentId }
            });

            if (!existing || existing.status !== 'enrolled') {
                return { success: false, message: 'You are not enrolled in this course' };
            }

            await Enrollment.update(
                { status: 'dropped' },
                { where: { enrollmentId: existing.enrollmentId } }
            );

            return { success: true, message: 'Dropped course successfully' };
        } catch (error) {
            console.error('Drop course error:', error);
            return { success: false, message: 'Failed to drop course', error: error.message };
        }
    }

    async listMyCourses(studentId) {
        try {
            const enrollments = await Enrollment.findAll({
                where: { studentId, status: 'enrolled' }
            });

            if (!enrollments.length) {
                return { success: true, courses: [] };
            }

            const courseIds = enrollments.map(e => e.courseId);
            const courses = await Course.findAll({
                where: { courseId: courseIds }
            });

            const instructorIds = [...new Set(courses.map(c => c.instructorId))];
            const instructors = await User.findAll({
                where: { userId: instructorIds },
                attributes: ['userId', 'username', 'firstName', 'lastName', 'email']
            });

            const instructorMap = new Map(instructors.map(i => [i.userId, i]));
            const enrollmentMap = new Map(enrollments.map(e => [e.courseId, e]));

            const result = courses.map(course => ({
                enrollmentId: enrollmentMap.get(course.courseId)?.enrollmentId,
                courseId: course.courseId,
                courseCode: course.courseCode,
                courseName: course.courseName,
                description: course.description,
                semester: course.semester,
                academicYear: course.academicYear,
                startDate: course.startDate,
                endDate: course.endDate,
                isActive: course.isActive,
                enrolledAt: enrollmentMap.get(course.courseId)?.enrolledAt,
                instructor: instructorMap.get(course.instructorId) || null
            }));

            return { success: true, courses: result };
        } catch (error) {
            console.error('List my courses error:', error);
            return { success: false, message: 'Failed to retrieve courses', error: error.message };
        }
    }

    async enrollTopic(topicId, studentId) {
        try {
            const topic = await Topic.findByPk(topicId);
            if (!topic) {
                return { success: false, message: 'Topic not found' };
            }

            const courseEnrollment = await Enrollment.findOne({
                where: { courseId: topic.courseId, studentId, status: 'enrolled' }
            });

            if (!courseEnrollment) {
                return { success: false, message: 'You must enroll in the course before enrolling in a topic' };
            }

            const existing = await TopicEnrollment.findOne({
                where: { topicId, studentId }
            });

            if (existing) {
                if (existing.status === 'enrolled') {
                    return { success: false, message: 'Already enrolled in this topic' };
                }

                await TopicEnrollment.update(
                    { status: 'enrolled', enrolledAt: new Date() },
                    { where: { topicEnrollmentId: existing.topicEnrollmentId } }
                );

                return { success: true, message: 'Re-enrolled in topic', topicEnrollmentId: existing.topicEnrollmentId };
            }

            const topicEnrollment = await TopicEnrollment.create({
                topicId,
                studentId,
                status: 'enrolled'
            });

            return { success: true, message: 'Enrolled in topic', topicEnrollmentId: topicEnrollment.topicEnrollmentId };
        } catch (error) {
            console.error('Enroll topic error:', error);
            return { success: false, message: 'Failed to enroll in topic', error: error.message };
        }
    }

    async dropTopic(topicId, studentId) {
        try {
            const existing = await TopicEnrollment.findOne({
                where: { topicId, studentId }
            });

            if (!existing || existing.status !== 'enrolled') {
                return { success: false, message: 'You are not enrolled in this topic' };
            }

            await TopicEnrollment.update(
                { status: 'dropped' },
                { where: { topicEnrollmentId: existing.topicEnrollmentId } }
            );

            return { success: true, message: 'Dropped topic successfully' };
        } catch (error) {
            console.error('Drop topic error:', error);
            return { success: false, message: 'Failed to drop topic', error: error.message };
        }
    }

    async listMyTopics(studentId) {
        try {
            const enrollments = await TopicEnrollment.findAll({
                where: { studentId, status: 'enrolled' }
            });

            if (!enrollments.length) {
                return { success: true, topics: [] };
            }

            const topicIds = enrollments.map(e => e.topicId);
            const topics = await Topic.findAll({
                where: { topicId: topicIds }
            });

            const courseIds = [...new Set(topics.map(t => t.courseId))];
            const courses = await Course.findAll({
                where: { courseId: courseIds }
            });

            const instructorIds = [...new Set(courses.map(c => c.instructorId))];
            const instructors = await User.findAll({
                where: { userId: instructorIds },
                attributes: ['userId', 'username', 'firstName', 'lastName', 'email']
            });

            const courseMap = new Map(courses.map(c => [c.courseId, c]));
            const instructorMap = new Map(instructors.map(i => [i.userId, i]));
            const enrollmentMap = new Map(enrollments.map(e => [e.topicId, e]));

            const result = topics.map(topic => {
                const course = courseMap.get(topic.courseId);
                return {
                    topicEnrollmentId: enrollmentMap.get(topic.topicId)?.topicEnrollmentId,
                    topicId: topic.topicId,
                    topicName: topic.topicName,
                    description: topic.description,
                    sequenceNumber: topic.sequenceNumber,
                    dueDate: topic.dueDate,
                    maxDurationMinutes: topic.maxDurationMinutes,
                    enrolledAt: enrollmentMap.get(topic.topicId)?.enrolledAt,
                    course: course ? {
                        courseId: course.courseId,
                        courseCode: course.courseCode,
                        courseName: course.courseName,
                        instructor: instructorMap.get(course.instructorId) || null
                    } : null
                };
            });

            return { success: true, topics: result };
        } catch (error) {
            console.error('List my topics error:', error);
            return { success: false, message: 'Failed to retrieve topics', error: error.message };
        }
    }
}

export default new EnrollmentService();
