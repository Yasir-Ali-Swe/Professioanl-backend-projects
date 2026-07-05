import express from "express";
import {
  getAllOrganizations,
  getOrganizationById,
  updateOrganizationStatus,
  deleteOrganization,
  getAnalytics,
  getOrganizationSubscriptionDetails,
  updateOrganizationSubscriptionPlan,
} from "../controllers/superAdmin.controller.js";
import { superAdminMiddleware } from "../middleware/superAdmin.middleware.js";

const router = express.Router();

router.get("/organizations", superAdminMiddleware, getAllOrganizations);
router.get("/organizations/:id", superAdminMiddleware, getOrganizationById);
router.delete("/organizations/:id", superAdminMiddleware, deleteOrganization);
router.get("/analytics", superAdminMiddleware, getAnalytics);
router.get(
  "/organizations/:id/subscription",
  superAdminMiddleware,
  getOrganizationSubscriptionDetails,
);
router.patch(
  "/organizations/:id/subscription",
  superAdminMiddleware,
  updateOrganizationSubscriptionPlan,
);
router.patch(
  "/organizations/:id/status",
  superAdminMiddleware,
  updateOrganizationStatus,
);

export default router;
