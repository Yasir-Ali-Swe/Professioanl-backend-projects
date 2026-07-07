import {
  createProduct,
  getAllProducts,
  updateProduct,
  getProductById,
  toggleProductActive,
} from "../controllers/product.controller.js";
import { authorize } from "../middleware/authorize.user.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { uploadProduct } from "../config/cloudinary.config.js";
import { uploadProductImage } from "../controllers/product.controller.js";
import express from "express";

const router = express.Router();

router.post(
  "/create-product",
  authMiddleware,
  authorize("admin", "manager"),
  createProduct,
);

router.patch(
  "/update-product/:id",
  authMiddleware,
  authorize("admin", "manager"),
  updateProduct,
);

router.patch(
  "/toggle-product-active/:id",
  authMiddleware,
  authorize("admin", "manager"),
  toggleProductActive,
);

router.get(
  "/get-all-products",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getAllProducts,
);

router.get(
  "/get-product-by-id/:id",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getProductById,
);

router.post(
  "/upload-product-image/:id",
  authMiddleware,
  authorize("admin", "manager"),
  uploadProduct.single("image"),
  uploadProductImage,
);

export default router;
