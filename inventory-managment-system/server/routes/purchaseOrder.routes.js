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

// Create PO (Admin auto-approves, Manager creates pending)
router.post(
  "/create-purchase-order",
  authMiddleware,
  authorize("admin", "manager"),
  createPurchaseOrder,
);

// Get all POs with filters (Admin, Manager)
router.get(
  "/get-all-purchase-orders",
  authMiddleware,
  authorize("admin", "manager"),
  getAllPurchaseOrders,
);

// Get PO by ID (Admin, Manager)
router.get(
  "/get-purchase-order-by-id/:id",
  authMiddleware,
  authorize("admin", "manager"),
  getPurchaseOrderById,
);

// Approve PO (Admin only - Manager cannot approve)
router.patch(
  "/approve-purchase-order/:id",
  authMiddleware,
  authorize("admin"), // FIXED: Only Admin can approve
  approvePurchaseOrder,
);

// Reject PO (Admin only - Manager cannot reject)
router.patch(
  "/reject-purchase-order/:id",
  authMiddleware,
  authorize("admin"), // FIXED: Only Admin can reject
  rejectPurchaseOrder,
);

// Fulfill PO (Admin and Manager - Admin and manager can fulfill)
router.patch(
  "/fulfill-purchase-order/:id",
  authMiddleware,
  authorize("admin","manager"), // FIXED: Admin and Manager can fulfill
  fulfillPurchaseOrder,
);

export default router;