import db from '../models/index.js';
import Sequelize from 'sequelize';

const { Op } = Sequelize;

const { Department, Course } = db;

class DepartmentService {
    /**
     * Create new department (Admin only)
     */
    async createDepartment(departmentData) {
        try {
            const { departmentCode, departmentName, description } = departmentData;

            // Check if department code already exists
            const existing = await Department.findOne({
                where: { departmentCode: departmentCode.toUpperCase() }
            });

            if (existing) {
                return { success: false, message: 'Mã bộ môn đã tồn tại' };
            }

            const department = await Department.create({
                departmentCode: departmentCode.toUpperCase(),
                departmentName,
                description,
                isActive: true
            });

            return {
                success: true,
                message: 'Tạo bộ môn thành công',
                data: department
            };
        } catch (error) {
            console.error('Create department error:', error);
            return { success: false, message: 'Không thể tạo bộ môn', error: error.message };
        }
    }

    /**
     * Get all departments with pagination
     */
    async getAllDepartments(page = 1, limit = 10, search = '', isActive = null) {
        try {
            const offset = (page - 1) * limit;
            const where = {};

            // Search by code or name
            if (search) {
                where[Op.or] = [
                    { departmentCode: { [Op.like]: `%${search}%` } },
                    { departmentName: { [Op.like]: `%${search}%` } }
                ];
            }

            // Filter by active status
            if (isActive !== null) {
                where.isActive = isActive === 'true' || isActive === true;
            }

            const { count, rows } = await Department.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['departmentCode', 'ASC']],
                attributes: ['departmentId', 'departmentCode', 'departmentName', 'description', 'isActive', 'createdAt', 'updatedAt']
            });

            return {
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Get all departments error:', error);
            return { success: false, message: 'Không thể lấy danh sách bộ môn', error: error.message };
        }
    }

    /**
     * Get department by ID
     */
    async getDepartmentById(departmentId) {
        try {
            const department = await Department.findByPk(departmentId, {
                include: [
                    {
                        model: Course,
                        as: 'courses',
                        attributes: ['courseId', 'courseCode', 'courseName', 'semester', 'academicYear', 'isActive']
                    }
                ]
            });

            if (!department) {
                return { success: false, message: 'Không tìm thấy bộ môn' };
            }

            return {
                success: true,
                data: department
            };
        } catch (error) {
            console.error('Get department by ID error:', error);
            return { success: false, message: 'Không thể lấy thông tin bộ môn', error: error.message };
        }
    }

    /**
     * Update department (Admin only)
     */
    async updateDepartment(departmentId, updateData) {
        try {
            const department = await Department.findByPk(departmentId);

            if (!department) {
                return { success: false, message: 'Không tìm thấy bộ môn' };
            }

            // Check if updating code and it conflicts with existing
            if (updateData.departmentCode && updateData.departmentCode.toUpperCase() !== department.departmentCode) {
                const existing = await Department.findOne({
                    where: {
                        departmentCode: updateData.departmentCode.toUpperCase(),
                        departmentId: { [Op.ne]: departmentId }
                    }
                });

                if (existing) {
                    return { success: false, message: 'Mã bộ môn đã tồn tại' };
                }

                updateData.departmentCode = updateData.departmentCode.toUpperCase();
            }

            await department.update(updateData);

            return {
                success: true,
                message: 'Cập nhật bộ môn thành công',
                data: department
            };
        } catch (error) {
            console.error('Update department error:', error);
            return { success: false, message: 'Không thể cập nhật bộ môn', error: error.message };
        }
    }

    /**
     * Delete department (Admin only)
     */
    async deleteDepartment(departmentId) {
        try {
            const department = await Department.findByPk(departmentId);

            if (!department) {
                return { success: false, message: 'Không tìm thấy bộ môn' };
            }

            // Check if department has courses
            const courseCount = await Course.count({
                where: { departmentId }
            });

            if (courseCount > 0) {
                return {
                    success: false,
                    message: `Không thể xóa bộ môn vì có ${courseCount} khóa học đang sử dụng`
                };
            }

            await department.destroy();

            return {
                success: true,
                message: 'Xóa bộ môn thành công'
            };
        } catch (error) {
            console.error('Delete department error:', error);
            return { success: false, message: 'Không thể xóa bộ môn', error: error.message };
        }
    }

    /**
     * Toggle department active status
     */
    async toggleDepartmentStatus(departmentId) {
        try {
            const department = await Department.findByPk(departmentId);

            if (!department) {
                return { success: false, message: 'Không tìm thấy bộ môn' };
            }

            await department.update({ isActive: !department.isActive });

            return {
                success: true,
                message: `${department.isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} bộ môn thành công`,
                data: department
            };
        } catch (error) {
            console.error('Toggle department status error:', error);
            return { success: false, message: 'Không thể thay đổi trạng thái bộ môn', error: error.message };
        }
    }
}

export default new DepartmentService();
