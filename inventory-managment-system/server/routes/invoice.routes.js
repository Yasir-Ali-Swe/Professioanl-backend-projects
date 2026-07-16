// routes/invoice.routes.js
import express from "express";
import {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  getInvoiceById,
  voidInvoice,
} from "../controllers/invoice.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

// Create invoice (Admin, Manager, Staff)
router.post(
  "/create-invoice",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  createInvoice,
);

// Get all invoices with filters & pagination (Admin, Manager)
router.get(
  "/get-all-invoices",
  authMiddleware,
  authorize("admin", "manager"),
  getAllInvoices,
);

// Get my invoices with filters & pagination (Staff)
router.get(
  "/get-my-invoices",
  authMiddleware,
  // authorize("staff"),
  getMyInvoices,
);

// Get invoice by ID (All roles with permissions)
router.get(
  "/get-invoice-by-id/:id",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getInvoiceById,
);

// Void invoice (Admin, Manager)
router.patch(
  "/void-invoice/:id",
  authMiddleware,
  authorize("admin", "manager"),
  voidInvoice,
);

export default router;
