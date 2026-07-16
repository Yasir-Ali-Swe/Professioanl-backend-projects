// routes/purchaseOrder.routes.js
import express from "express";
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  fulfillPurchaseOrder,
} from "../controllers/purchaseOrder.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

router.post(
  "/create-purchase-order",
  authMiddleware,
  authorize("admin", "manager"),
  createPurchaseOrder,
);

router.get(
  "/get-all-purchase-orders",
  authMiddleware,
  authorize("admin", "manager"),
  getAllPurchaseOrders,
);

router.get(
  "/get-purchase-order-by-id/:id",
  authMiddleware,
  authorize("admin", "manager"),
  getPurchaseOrderById,
);

router.patch(
  "/approve-purchase-order/:id",
  authMiddleware,
  authorize("admin"),
  approvePurchaseOrder,
);

router.patch(
  "/reject-purchase-order/:id",
  authMiddleware,
  authorize("admin"),
  rejectPurchaseOrder,
);

router.patch(
  "/fulfill-purchase-order/:id",
  authMiddleware,
  authorize("admin", "manager"),
  fulfillPurchaseOrder,
);

export default router;
