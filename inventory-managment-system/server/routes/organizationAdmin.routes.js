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
import { adminMiddleware } from "../middleware/admin.middleware.js";
import express from "express";

const router = express.Router();
router.get("organization-profile", adminMiddleware, getOrganizationProfile);
router.patch("organization-profile", adminMiddleware, updateOrganizationProfile);
router.get("organization-admin-profile", adminMiddleware, getOrganizationAdminProfile);
router.patch("organization-admin-profile", adminMiddleware, updateOrganizationAdminProfile);
router.get("organization-invoice-details", adminMiddleware, getOrganizationInvoiceDetails);
router.patch("organization-invoice-details", adminMiddleware, updateOrganizationInvoiceDetails);
router.post("organization-invite-users", adminMiddleware, adminInviteOrganizationUsers);
router.get("organization-users", adminMiddleware, getOrganizationUsers);
router.get("organization-users/:id", adminMiddleware, getOrganizationUserById);
router.patch("organization-users/:id", adminMiddleware, updateOrganizationUserById);
router.delete("organization-users/:id", adminMiddleware, deleteOrganizationUserById);
router.get("dashboard-stats", adminMiddleware, getDashboardStats);

export default router;