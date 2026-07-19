// routes/dashboard.routes.js
import express from "express";
import {
  getSuperAdminDashboardStats,
  getAdminDashboardStats,
  getManagerDashboardStats,
  getStaffDashboardStats,
  getSalesTrends,
  getStockLevelsReport,
  getFinancialReport,
} from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

// Super Admin Dashboard
router.get(
  "/super-admin-dashboard-stats",
  authMiddleware,
  authorize("super_admin"),
  getSuperAdminDashboardStats,
);

// Admin Dashboard
router.get(
  "/admin-dashboard-stats",
  authMiddleware,
  authorize("admin"),
  getAdminDashboardStats,
);

// Manager Dashboard
router.get(
  "/manager-dashboard-stats",
  authMiddleware,
  authorize("manager"),
  getManagerDashboardStats,
);

// Staff Dashboard
router.get(
  "/staff-dashboard-stats",
  authMiddleware,
  authorize("staff"),
  getStaffDashboardStats,
);

// Reports
router.get(
  "/sales-trends",
  authMiddleware,
  authorize("admin", "manager"),
  getSalesTrends,
);

router.get(
  "/stock-levels-report",
  authMiddleware,
  authorize("admin", "manager"),
  getStockLevelsReport,
);

router.get(
  "/financial-report",
  authMiddleware,
  authorize("admin", "manager"),
  getFinancialReport,
);

export default router;
