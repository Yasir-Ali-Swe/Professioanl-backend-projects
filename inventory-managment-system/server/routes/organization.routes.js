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
  uploadOrganizationLogo,
} from "../controllers/organization.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";
import { uploadOrganization } from "../config/cloudinary.config.js";
import express from "express";

const router = express.Router();

router.get(
  "/organization-profile",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getOrganizationProfile,
);
router.patch(
  "/organization-profile",
  authMiddleware,
  authorize("admin"),
  updateOrganizationProfile,
);

router.post(
  "/organization-logo",
  authMiddleware,
  authorize("admin"),
  uploadOrganization.single("image"),
  uploadOrganizationLogo,
);

router.get(
  "/organization-admin-profile",
  authMiddleware,
  authorize("admin"),
  getOrganizationAdminProfile,
);
router.patch(
  "/organization-admin-profile",
  authMiddleware,
  authorize("admin"),
  updateOrganizationAdminProfile,
);

router.get(
  "/organization-invoice-details",
  authMiddleware,
  authorize("admin", "manager", "staff"),
  getOrganizationInvoiceDetails,
);
router.patch(
  "/organization-invoice-details",
  authMiddleware,
  authorize("admin"),
  updateOrganizationInvoiceDetails,
);

router.post(
  "/organization-users/invite",
  authMiddleware,
  authorize("admin", "manager"),
  adminInviteOrganizationUsers,
);
router.get(
  "/organization-users",
  authMiddleware,
  authorize("admin", "manager"),
  getOrganizationUsers,
);
router.get(
  "/organization-users/:id",
  authMiddleware,
  authorize("admin", "manager"),
  getOrganizationUserById,
);
// update the status or role of the org user by admin or manager
router.patch(
  "/organization-users/:id",
  authMiddleware,
  authorize("admin", "manager"),
  updateOrganizationUserById,
);
// admin can delete the org user
router.delete(
  "/organization-users/:id",
  authMiddleware,
  authorize("admin"),
  deleteOrganizationUserById,
);

router.get(
  "/organization-dashboard-stats",
  authMiddleware,
  authorize("admin", "manager"),
  getDashboardStats,
);

export default router;
