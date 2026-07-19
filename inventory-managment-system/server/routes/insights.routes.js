import express from "express";
import {
  getLatestInsight,
  getInsightsHistory,
  generateInsightNow,
  generateInsightStream,
} from "../controllers/insights.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";
import { requirePremium } from "../middleware/featureAccess.middleware.js";

const router = express.Router();

router.get(
  "/insights/summary",
  authMiddleware,
  authorize("admin", "manager"),
  requirePremium,
  getLatestInsight,
);

router.get(
  "/insights/history",
  authMiddleware,
  authorize("admin", "manager"),
  requirePremium,
  getInsightsHistory,
);

router.post(
  "/insights/generate",
  authMiddleware,
  authorize("admin", "manager"),
  requirePremium,
  generateInsightNow,
);

router.post(
  "/insights/generate/stream",
  authMiddleware,
  authorize("admin", "manager"),
  requirePremium,
  generateInsightStream,
);

export default router;
