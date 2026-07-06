import {
  getOrganizationProfile,
  updateOrganizationProfile,
  getOrganizationAdminProfile,
  updateOrganizationAdminProfile,
  getOrganizationInvoiceDetails,
  updateOrganizationInvoiceDetails,
  adminInviteOrganizationUsers,
  getOrganizationUsers,
  getOrganizationUserById,
  updateOrganizationUserById,
  deleteOrganizationUserById,
  getDashboardStats,
} from "../controllers/organizationAdmin.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";
import express from "express";

const router = express.Router();
router.get(
  "organization-profile",
  authMiddleware,
  authorize("admin"),
  getOrganizationProfile,
);
router.patch(
  "organization-profile",
  authMiddleware,
  authorize("admin"),
  updateOrganizationProfile,
);
router.get(
  "organization-admin-profile",
  authMiddleware,
  authorize("admin"),
  getOrganizationAdminProfile,
);
router.patch(
  "organization-admin-profile",
  authMiddleware,
  authorize("admin"),
  updateOrganizationAdminProfile,
);
router.get(
  "organization-invoice-details",
  authMiddleware,
  authorize("admin"),
  getOrganizationInvoiceDetails,
);
router.patch(
  "organization-invoice-details",
  authMiddleware,
  authorize("admin"),
  updateOrganizationInvoiceDetails,
);
router.post(
  "organization-invite-users",
  authMiddleware,
  authorize("admin"),
  adminInviteOrganizationUsers,
);
router.get(
  "organization-users",
  authMiddleware,
  authorize("admin"),
  getOrganizationUsers,
);
router.get(
  "organization-users/:id",
  authMiddleware,
  authorize("admin"),
  getOrganizationUserById,
);
router.patch(
  "organization-users/:id",
  authMiddleware,
  authorize("admin"),
  updateOrganizationUserById,
);
router.delete(
  "organization-users/:id",
  authMiddleware,
  authorize("admin"),
  deleteOrganizationUserById,
);
router.get(
  "dashboard-stats",
  authMiddleware,
  authorize("admin"),
  getDashboardStats,
);

export default router;
