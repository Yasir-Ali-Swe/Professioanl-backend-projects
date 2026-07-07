import express from "express";
import {
  getDashboardSummary,
  getSalesTrends,
  getStockLevelsReport,
  getFinancialReport,
} from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

router.get(
  "/dashboard-summary",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getDashboardSummary,
);

router.get(
  "/sales-trends",
  authMiddleware,
  authorize("admin", "manager"),
  getSalesTrends,
);

router.get(
  "/stock-levels",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getStockLevelsReport,
);

router.get(
  "/financial-report",
  authMiddleware,
  authorize("admin", "manager"),
  getFinancialReport,
);

export default router;
