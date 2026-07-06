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

router.post(
  "/create-invoice",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  createInvoice,
);

router.get(
  "/get-all-invoices",
  authMiddleware,
  authorize("admin", "manager"),
  getAllInvoices,
);

router.get(
  "/get-my-invoices",
  authMiddleware,
  authorize("staff"),
  getMyInvoices,
);

router.get(
  "/get-invoice-by-id/:id",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getInvoiceById,
);

router.patch(
  "/void-invoice/:id",
  authMiddleware,
  authorize("admin", "manager"),
  voidInvoice,
);

export default router;
