import { getUserFromToken } from "../helpers/jwt.helper.js";

export const superAdminMiddleware = async (req, res, next) => {
  try {
    const headers = req.headers.authorization;
    if (!headers || !headers.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token is required",
      });
    }
    const token = headers.split(" ")[1];
    const user = await getUserFromToken(token, "auth");
    if (!user || user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied.Only authorized users have rights to access this route.",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in superAdminMiddleware:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
