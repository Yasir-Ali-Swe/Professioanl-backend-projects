import { getUserFromToken } from "../helpers/jwt.helper.js";

export const adminMiddleware = async (req, res, next) => {
    try {
        const headers = req.headers.authorization;
        if(!headers || !headers.startsWith("Bearer ")){
            return res.status(401).json({
                success: false,
                message: "Not authorized, token is required",
            });
        }
        const token = headers.split(" ")[1];
        const user = await getUserFromToken(token, "auth");
        if (!user || user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied, admin privileges required",
            });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error("Error in adminMiddleware:", error.message);
        res.status(error.status ||500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}