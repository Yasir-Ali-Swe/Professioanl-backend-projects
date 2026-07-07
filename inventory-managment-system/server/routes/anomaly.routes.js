// routes/anomaly.routes.js
import express from "express";
import {
  getAnomalies,
  getAnomalyById,
  resolveAnomaly,
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

export default router;
