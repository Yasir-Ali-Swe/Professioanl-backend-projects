import { authorizeChatbotAccess } from "./featureAccess.middleware.js";

export const requireChatbotAccess = async (req, res, next) => {
  await authorizeChatbotAccess(req, res, (err) => {
    if (err) return next(err);

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (user.role === "super_admin") {
      req.chatbotScope = "global";
    } else if (user.role === "admin") {
      req.chatbotScope = "org";
      req.organizationId = user.organizationId;
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    next();
  });
};
