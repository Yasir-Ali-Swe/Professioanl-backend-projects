import { getUserFromToken } from "../helpers/jwt.helper.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    const user = await getUserFromToken(token, "auth");
    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before accessing this resource.",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact the administrator.",
      });
    }
    req.user = user;
    req.organizationId = user.organizationId;

    next();
  } catch (error) {
    console.error("Error in authMiddleware:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
