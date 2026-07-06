import {
  createSupplier,
  getAllSuppliers,
  getSupplierByIdWithProducts,
  deleteSupplier,
  updateSupplier,
} from "../controllers/supplier.controller.js";
import { authorize } from "../middleware/authorize.user.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import express from "express";

const router = express.Router();

router.post(
  "/create-supplier",
  authMiddleware,
  authorize("admin", "manager"),
  createSupplier,
);

router.patch(
  "/update-supplier/:id",
  authMiddleware,
  authorize("admin", "manager"),
  updateSupplier,
);

router.get(
  "/get-all-suppliers",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getAllSuppliers,
);

router.get(
  "/get-supplier-with-products/:id",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getSupplierByIdWithProducts,
);

router.delete(
  "/delete-supplier/:id",
  authMiddleware,
  authorize("admin", "manager"),
  deleteSupplier,
);

export default router;
