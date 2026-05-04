import departmentService from '../services/departmentService.js';
import { emitDepartmentEvent } from '../websocket/emitters.js';

class DepartmentController {
    /**
     * Create new department
     * POST /api/v1/admin/departments
     */
    async createDepartment(req, res) {
        try {
            const { departmentCode, departmentName, description } = req.body;

            // Validation
            if (!departmentCode || !departmentName) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã bộ môn và tên bộ môn là bắt buộc'
                });
            }

            const result = await departmentService.createDepartment({
                departmentCode,
                departmentName,
                description
            });

            if (result.success) {
                emitDepartmentEvent("created", {
                    actorUserId: req.user?.userId || null,
                    departmentId: result.data?.departmentId,
                    department: result.data,
                });
            }

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Create department error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    /**
     * Get all departments with pagination
     * GET /api/v1/admin/departments
     */
    async getAllDepartments(req, res) {
        try {
            const { page = 1, limit = 10, search = '', isActive } = req.query;

            const result = await departmentService.getAllDepartments(page, limit, search, isActive);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Get all departments error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    /**
     * Get department by ID
     * GET /api/v1/admin/departments/:id
     */
    async getDepartmentById(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bộ môn không hợp lệ'
                });
            }

            const result = await departmentService.getDepartmentById(parseInt(id));

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(404).json(result);
            }
        } catch (error) {
            console.error('Get department by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    /**
     * Update department
     * PUT /api/v1/admin/departments/:id
     */
    async updateDepartment(req, res) {
        try {
            const { id } = req.params;
            const { departmentCode, departmentName, description, isActive } = req.body;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bộ môn không hợp lệ'
                });
            }

            const updateData = {};
            if (departmentCode) updateData.departmentCode = departmentCode;
            if (departmentName) updateData.departmentName = departmentName;
            if (description !== undefined) updateData.description = description;
            if (isActive !== undefined) updateData.isActive = isActive;

            const result = await departmentService.updateDepartment(parseInt(id), updateData);

            if (result.success) {
                emitDepartmentEvent("updated", {
                    actorUserId: req.user?.userId || null,
                    departmentId: parseInt(id),
                    department: result.data,
                });
            }

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Update department error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    /**
     * Delete department
     * DELETE /api/v1/admin/departments/:id
     */
    async deleteDepartment(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bộ môn không hợp lệ'
                });
            }

            const result = await departmentService.deleteDepartment(parseInt(id));

            if (result.success) {
                emitDepartmentEvent("deleted", {
                    actorUserId: req.user?.userId || null,
                    departmentId: parseInt(id),
                });
            }

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Delete department error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    /**
     * Toggle department active status
     * PATCH /api/v1/admin/departments/:id/toggle-status
     */
    async toggleDepartmentStatus(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bộ môn không hợp lệ'
                });
            }

            const result = await departmentService.toggleDepartmentStatus(parseInt(id));

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('Toggle department status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }
}

export default new DepartmentController();
