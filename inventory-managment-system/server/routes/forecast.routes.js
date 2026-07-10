// routes/forecast.routes.js
import express from "express";
import {
  getForecastForProduct,
  getAllForecasts,
  generateReorderSuggestion, // NEW IMPORT
  getReorderSuggestions,
  approveReorderSuggestion,
  dismissReorderSuggestion,
} from "../controllers/forecast.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

router.get(
  "/forecast/:id",
  authMiddleware,
  authorize("admin", "manager"),
  getForecastForProduct,
);

router.get(
  "/forecasts",
  authMiddleware,
  authorize("admin", "manager"),
  getAllForecasts,
);


router.get(
  "/reorder-suggestions",
  authMiddleware,
  authorize("admin", "manager"),
  getReorderSuggestions,
);

router.post(
  "/reorder-suggestions/generate/:id",
  authMiddleware,
  authorize("admin", "manager"),
  generateReorderSuggestion,
);

router.patch(
  "/reorder-suggestions/:id/approve",
  authMiddleware,
  authorize("admin", "manager"),
  approveReorderSuggestion,
);


router.patch(
  "/reorder-suggestions/:id/dismiss",
  authMiddleware,
  authorize("admin", "manager"),
  dismissReorderSuggestion,
);

export default router;
