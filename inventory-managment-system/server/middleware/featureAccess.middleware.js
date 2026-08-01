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

export const verifyChatbotAccessPermission = async (user, organizationId) => {
  if (!user) {
    return {
      allowed: false,
      status: 401,
      message: "Unauthorized user",
    };
  }

  const role = user.role;

  if (role === "super_admin") {
    return { allowed: true };
  }

  if (role === "manager" || role === "staff") {
    return {
      allowed: false,
      status: 403,
      message:
        "Chatbot access is not available for your role. Access is restricted to organization administrators.",
    };
  }

  if (role === "admin") {
    if (!organizationId) {
      return {
        allowed: false,
        status: 401,
        message: "Unauthorized: Organization not found",
      };
    }

    const { hasAccess, plan, message, upgradeRequired } =
      await checkPremiumAccess(organizationId);
    if (!hasAccess) {
      return {
        allowed: false,
        status: 403,
        upgradeRequired: true,
        currentPlan: plan || "free",
        message:
          message ||
          "The StockPilot AI chatbot requires an active Premium subscription with AI features enabled.",
        recommendedAction:
          "Please upgrade to Premium plan to access this feature",
      };
    }

    return { allowed: true, plan };
  }

  return {
    allowed: false,
    status: 403,
    message: "Access denied.",
  };
};

export const authorizeChatbotAccess = async (req, res, next) => {
  try {
    const result = await verifyChatbotAccessPermission(
      req.user,
      req.organizationId,
    );

    if (!result.allowed) {
      return res.status(result.status || 403).json({
        success: false,
        message: result.message,
        upgradeRequired: result.upgradeRequired || false,
        currentPlan: result.currentPlan || null,
        recommendedAction: result.recommendedAction || null,
      });
    }

    if (result.plan) {
      req.plan = result.plan;
    }
    next();
  } catch (error) {
    console.error("Error in authorizeChatbotAccess middleware:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
