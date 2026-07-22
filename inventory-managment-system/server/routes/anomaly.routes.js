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
  authorize("admin"),
  getAnomalies,
);

router.get(
  "/anomalies/:id",
  authMiddleware,
  authorize("admin"),
  getAnomalyById,
);

router.patch(
  "/anomalies/:id/resolve",
  authMiddleware,
  authorize("admin"),
  resolveAnomaly,
);

router.post(
  "/anomalies/run-detection",
  authMiddleware,
  authorize("admin"),
  runAnomalyDetection,
);

export default router;
