import express from "express";
import roleController from "../controllers/roleController.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/authMiddleware.js";
import { body } from "express-validator";
import businessConstants from "../constants/businessConstants.js";

const router = express.Router();
const { ROLE_VALUES } = businessConstants;

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
      .isIn(ROLE_VALUES)
      .withMessage(`Role must be one of: ${ROLE_VALUES.join(", ")}`),
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
      .isIn(ROLE_VALUES)
      .withMessage(`Role must be one of: ${ROLE_VALUES.join(", ")}`),
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
      .isIn(ROLE_VALUES)
      .withMessage(`Old role must be one of: ${ROLE_VALUES.join(", ")}`),
    body("newRoleName")
      .isIn(ROLE_VALUES)
      .withMessage(`New role must be one of: ${ROLE_VALUES.join(", ")}`),
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
