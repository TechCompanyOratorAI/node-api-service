import express from "express";
import roleController from "../controllers/roleController.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/authMiddleware.js";
import { body } from "express-validator";

const router = express.Router();

// Public routes (authenticated users)
router.get("/all", authenticateToken, roleController.getAllRoles);
router.get("/my-roles", authenticateToken, roleController.getMyRoles);

// Admin only routes
router.post(
  "/assign",
  authenticateToken,
  requireRole(["Admin"]),
  [
    body("userId").isInt().withMessage("User ID must be a valid integer"),
    body("roleName")
      .isIn(["Admin", "Instructor", "Student"])
      .withMessage("Role must be Admin, Instructor, or Student"),
  ],
  roleController.assignRole
);

router.post(
  "/remove",
  authenticateToken,
  requireRole(["Admin"]),
  [
    body("userId").isInt().withMessage("User ID must be a valid integer"),
    body("roleName")
      .isIn(["Admin", "Instructor", "Student"])
      .withMessage("Role must be Admin, Instructor, or Student"),
  ],
  roleController.removeRole
);

router.put(
  "/update",
  authenticateToken,
  requireRole(["Admin"]),
  [
    body("userId").isInt().withMessage("User ID must be a valid integer"),
    body("oldRoleName")
      .isIn(["Admin", "Instructor", "Student"])
      .withMessage("Old role must be Admin, Instructor, or Student"),
    body("newRoleName")
      .isIn(["Admin", "Instructor", "Student"])
      .withMessage("New role must be Admin, Instructor, or Student"),
  ],
  roleController.updateUserRole
);

router.get(
  "/users/:roleName",
  authenticateToken,
  requireRole(["Admin"]),
  roleController.getUsersByRole
);

router.get(
  "/user/:userId",
  authenticateToken,
  requireRole(["Admin"]),
  roleController.getUserRoles
);

// Initialize default roles (run once)
router.post(
  "/initialize",
  authenticateToken,
  requireRole(["Admin"]),
  roleController.initializeRoles
);

export default router;
