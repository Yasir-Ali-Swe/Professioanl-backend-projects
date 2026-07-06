import express from "express";
import {
  stockIn,
  stockOut,
  getStockHistory,
  getLowStockProducts,
} from "../controllers/stock.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

router.post(
  "/stock-in",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  stockIn,
);

router.post(
  "/stock-out",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  stockOut,
);

router.get(
  "/stock-history/:productId",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getStockHistory,
);

router.get(
  "/low-stock",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getLowStockProducts,
);

export default router;
