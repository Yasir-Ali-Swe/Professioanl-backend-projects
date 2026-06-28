import {
  register,
  verifyEmail,
  login,
  getCurrentLoginUser,
  getNewAccessToken,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import express from "express";
import { authMiddleware } from "../middleware/auht.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email/:token", verifyEmail);
router.post("/login", login);
router.get("/me", authMiddleware, getCurrentLoginUser);
router.post("/refresh-token", getNewAccessToken);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
