import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import userModel from "../models/user.model.js";

export const generateToken = (
  id,
  expireAt,
  purpose = "auth",
  tokenVersion = 0,
) => {
  return jwt.sign({ id, purpose, tokenVersion }, JWT_SECRET, {
    expiresIn: expireAt,
  });
};

export const getUserFromToken = async (token, purpose = "auth") => {
  if (!token) {
    const error = new Error("No token provided");
    error.status = 401;
    throw error;
  }
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      const error = new Error("Invalid or expired token");
      error.status = 401;
      throw error;
    }
  }
  if (decoded.purpose !== purpose) {
    const error = new Error("Invalid token purpose");
    error.status = 401;
    throw error;
  }
  const user = await userModel.findById(decoded.id);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (decoded.tokenVersion !== user.tokenVersion) {
    const error = new Error("Token has been revoked");
    error.status = 401;
    throw error;
  }
  return user;
};
