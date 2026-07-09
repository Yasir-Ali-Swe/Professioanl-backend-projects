// routes/billing.routes.js
import express from "express";
import {
  createCheckoutSession,
  stripeWebhook,
  getSubscription,
  cancelSubscription,
} from "../controllers/billing.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";

const router = express.Router();

// Webhook route - must use raw body, no auth
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// Protected routes - Admin only
router.post(
  "/create-checkout-session",
  authMiddleware,
  authorize("admin"),
  createCheckoutSession,
);

router.get(
  "/subscription",
  authMiddleware,
  authorize("admin"),
  getSubscription,
);

router.post("/cancel", authMiddleware, authorize("admin"), cancelSubscription);

export default router;
