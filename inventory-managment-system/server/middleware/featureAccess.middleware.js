// middleware/featureAccess.middleware.js
import { checkPremiumAccess } from "../services/plan.service.js";

/**
 * Middleware to check if organization has Premium access for LLM features
 * Only for endpoints that use Gemini API
 */
export const requirePremium = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Organization not found",
      });
    }

    const { hasAccess, plan, message, upgradeRequired } =
      await checkPremiumAccess(organizationId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          message || "This AI feature is only available on Premium plans",
        upgradeRequired: true,
        currentPlan: plan || "free",
        recommendedAction:
          "Please upgrade to Premium plan to access this feature",
      });
    }

    // Attach plan info to request
    req.plan = plan;
    next();
  } catch (error) {
    console.error("Error in requirePremium middleware:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
