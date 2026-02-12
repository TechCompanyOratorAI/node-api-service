import express from 'express';
import departmentController from '../controllers/departmentController.js';
import { requireRole, authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin only routes for department management
router.post('/',
    authenticateToken,
    requireEmailVerification,
    requireRole(['Admin']),
    departmentController.createDepartment
);

// Get all departments - public access (for registration)
router.get('/',
    departmentController.getAllDepartments
);

// Get department by ID - accessible by all authenticated users
router.get('/:id',
    authenticateToken,
    requireEmailVerification,
    departmentController.getDepartmentById
);

router.put('/:id',
    authenticateToken,
    requireEmailVerification,
    requireRole(['Admin']),
    departmentController.updateDepartment
);

router.delete('/:id',
    authenticateToken,
    requireEmailVerification,
    requireRole(['Admin']),
    departmentController.deleteDepartment
);

router.patch('/:id/toggle-status',
    authenticateToken,
    requireEmailVerification,
    requireRole(['Admin']),
    departmentController.toggleDepartmentStatus
);

export default router;
