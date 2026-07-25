// middleware/featureAccess.middleware.js
import { checkPremiumAccess } from "../services/plan.service.js";

/**
 * Middleware to check if organization has Premium access for LLM features
 * Only for endpoints that use Gemini API
 */
export const requirePremium = async (req, res, next) => {
  try {
    if (req.user && req.user.role === "super_admin") {
      return next();
    }

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

export const authorizeChatbotAccess = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (role === "super_admin") {
      return next();
    }
    if (role === "admin") {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Organization not found",
        });
      }
      const { hasAccess, plan, message } = await checkPremiumAccess(organizationId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: message || "This AI feature is only available on Premium plans",
          upgradeRequired: true,
          currentPlan: plan || "free",
          recommendedAction: "Please upgrade to Premium plan to access this feature",
        });
      }
      req.plan = plan;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. Chatbot is restricted to administrators.",
    });
  } catch (error) {
    console.error("Error in authorizeChatbotAccess middleware:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
