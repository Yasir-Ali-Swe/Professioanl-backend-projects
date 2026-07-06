import {
  createCategory,
  updateCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  getCategoryProducts,
  deleteCategory,
} from "../controllers/category.controller.js";

import { authorize } from "../middleware/authorize.user.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import express from "express";

const router = express.Router();

router.post(
  "/create-category",
  authMiddleware,
  authorize("admin", "manager"),
  createCategory,
);
router.patch(
  "/update-category/:id",
  authMiddleware,
  authorize("admin", "manager"),
  updateCategory,
);
router.get(
  "/get-all-categories",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getAllCategories,
);
router.get(
  "/get-category-by-id/:id",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getCategoryById,
);
router.get(
  "/get-category-by-slug/:slug",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getCategoryBySlug,
);
router.get(
  "/get-category-products/:id",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getCategoryProducts,
);
router.delete(
  "/delete-category/:id",
  authMiddleware,
  authorize("admin", "manager"),
  deleteCategory,
);

export default router;
