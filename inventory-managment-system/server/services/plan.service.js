// services/plan.service.js
import organizationModel from "../models/organization.model.js";
import subscriptionModel from "../models/subscription.model.js";

/**
 * Check if an organization has access to LLM/AI features (Premium)
 * @param {string} organizationId - Organization ID
 * @returns {Promise<{ hasAccess: boolean, plan: string, message: string }>}
 */
export const checkPremiumAccess = async (organizationId) => {
  const organization = await organizationModel
    .findById(organizationId)
    .populate("subscriptionPlan");

  if (!organization) {
    return {
      hasAccess: false,
      plan: null,
      message: "Organization not found",
    };
  }

  const planName = organization.subscriptionPlan?.name || "free";
  const aiFeatures = organization.subscriptionPlan?.aiFeatures === true;

  const subRecord = await subscriptionModel.findOne({ organizationId }).lean();
  const isStatusActive = subRecord ? subRecord.status === "active" : true;

  // Check if organization has premium for LLM features and active subscription status
  if (!aiFeatures || !isStatusActive) {
    return {
      hasAccess: false,
      plan: planName,
      message: `The StockPilot AI Chatbot requires an active Premium subscription with AI features enabled.`,
      upgradeRequired: true,
    };
  }

  return {
    hasAccess: true,
    plan: planName,
    message: "Premium AI features available",
  };
};

/**
 * Get LLM feature availability for an organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Feature availability map
 */
export const getLLMFeatureAvailability = async (organizationId) => {
  const organization = await organizationModel
    .findById(organizationId)
    .populate("subscriptionPlan");

  if (!organization) {
    return { error: "Organization not found" };
  }

  const planName = organization.subscriptionPlan?.name || "free";
  const aiFeatures = organization.subscriptionPlan?.aiFeatures || false;

  return {
    plan: planName,
    isPremium: planName === "premium" && aiFeatures,
    features: {
      // LLM-based features (Premium only)
      ai_insights: planName === "premium" && aiFeatures,
      ai_chat: planName === "premium" && aiFeatures,

      // Rule-based features (Always available)
      ai_forecast: true,
      ai_anomaly: true,
      ai_reorder: true,

      // Core features (Always available)
      inventory_management: true,
      invoicing: true,
      purchase_orders: true,
      dashboard: true,
    },
  };
};
