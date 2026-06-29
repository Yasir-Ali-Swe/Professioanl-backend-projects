import { JWT_SECRET } from "../config/env.js";
import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";

export const generateToken = (
  userId,
  expiresIn,
  userTokenVersion = 0,
  purpose = "auth",
) => {
  return jwt.sign({ userId, userTokenVersion, purpose }, JWT_SECRET, {
    expiresIn,
  });
};

export const getUserFromToken = async (token, tokenPurpose = "auth") => {
  try {
    if (!token) {
      const err = new Error("Token is required");
      err.status = 400;
      throw err;
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (
        err.name === "TokenExpiredError" ||
        err.name === "JsonWebTokenError"
      ) {
        const error = new Error("Invalid or expired token");
        error.status = 401;
        throw error;
      }
      throw err;
    }
    const { userId, userTokenVersion, purpose } = decoded;
    const user = await userModel.findById(userId);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    if (userTokenVersion !== user.userTokenVersion) {
      const err = new Error("Token has been invalidated");
      err.status = 401;
      throw err;
    }
    if (purpose !== tokenPurpose) {
      const err = new Error("Token purpose mismatch");
      err.status = 400;
      throw err;
    }
    return user;
  } catch (error) {
    console.log("Error in getUserFromToken:", error.message);
    if (error.status) {
      throw error;
    }
    const err = new Error("internal server error");
    err.status = 500;
    throw err;
  }
};
