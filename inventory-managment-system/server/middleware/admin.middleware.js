import { getUserFromToken } from "../helpers/jwt.helper.js";

export const adminMiddleware = async (req, res, next) => {
    try {
        const headers = req.headers.authorization;
        if(!headers || !headers.startsWith("Bearer ")){
            return res.status(401).json({
                success: false,
                message: "Not authorized.Token is required",
            });
        }
        const token = headers.split(" ")[1];
        const user = await getUserFromToken(token, "auth");
        if (!user || user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied.Only authorized users have rights to access this route.",
            });
        }
        req.user = user;
        req.organizationId = user.organizationId; // Attach organizationId to the request object
        next();
    } catch (error) {
        console.error("Error in adminMiddleware:", error.message);
        res.status(error.status ||500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}