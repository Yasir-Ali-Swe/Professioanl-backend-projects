import express from "express";
import {
  getAllOrganizations,
  getOrganizationById,
  updateOrganizationStatus,
  deleteOrganization,
  getAnalytics,
  getOrganizationSubscriptionDetails,
  updateOrganizationSubscriptionPlan,
  getAllOrganizationSubscriptions,
} from "../controllers/superAdmin.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

router.get(
  "/organizations",
  authMiddleware,
  authorize("super_admin"),
  getAllOrganizations,
);
router.get(
  "/organization/:id",
  authMiddleware,
  authorize("super_admin"),
  getOrganizationById,
);
router.delete(
  "/organization/:id",
  authMiddleware,
  authorize("super_admin"),
  deleteOrganization,
);
router.get(
  "/platform-analytics",
  authMiddleware,
  authorize("super_admin"),
  getAnalytics,
);
router.get(
  "/organizations/subscriptions",
  authMiddleware,
  authorize("super_admin"),
  getAllOrganizationSubscriptions,
);

router.get(
  "/organizations/:id/subscription",
  authMiddleware,
  authorize("super_admin"),
  getOrganizationSubscriptionDetails,
);

router.patch(
  "/organizations/:id/subscription",
  authMiddleware,
  authorize("super_admin"),
  updateOrganizationSubscriptionPlan,
);

router.patch(
  "/organization/:id/status",
  authMiddleware,
  authorize("super_admin"),
  updateOrganizationStatus,
);

export default router;
