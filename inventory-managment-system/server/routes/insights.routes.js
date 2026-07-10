import express from "express";
import {
  getLatestInsight,
  getInsightsHistory,
  generateInsightNow,
  generateInsightStream, 
} from "../controllers/insights.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();


router.get(
  "/insights/summary",
  authMiddleware,
  authorize("admin", "manager"),
  getLatestInsight,
);

router.get(
  "/insights/history",
  authMiddleware,
  authorize("admin", "manager"),
  getInsightsHistory,
);

router.post(
  "/insights/generate",
  authMiddleware,
  authorize("admin", "manager"),
  generateInsightNow,
);

router.post(
  "/insights/generate/stream",
  authMiddleware,
  authorize("admin", "manager"),
  generateInsightStream,
);

export default router;
