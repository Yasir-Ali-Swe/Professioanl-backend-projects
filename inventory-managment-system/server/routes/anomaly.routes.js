// routes/anomaly.routes.js
import express from "express";
import {
  getAnomalies,
  getAnomalyById,
  resolveAnomaly,
  runAnomalyDetection,
} from "../controllers/anomaly.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

router.get(
  "/anomalies",
  authMiddleware,
  authorize("admin", "manager"),
  getAnomalies,
);

router.get(
  "/anomalies/:id",
  authMiddleware,
  authorize("admin", "manager"),
  getAnomalyById,
);

router.patch(
  "/anomalies/:id/resolve",
  authMiddleware,
  authorize("admin", "manager"),
  resolveAnomaly,
);

router.post(
  "/anomalies/run-detection",
  authMiddleware,
  authorize("admin", "manager"),
  runAnomalyDetection,
);

export default router;
