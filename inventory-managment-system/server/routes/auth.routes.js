import {
  registerUser,verifyEmail,loginUser,getLoginUser,refreshAuth,logoutUser,forgetPassword,resetPassword
} from "../controllers/auth.controller.js";
import express from "express";
import { authMiddleware } from "../middleware/auht.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-email/:token", verifyEmail);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getLoginUser);
router.post("/refresh-auth", refreshAuth);
router.post("/logout", authMiddleware, logoutUser);
router.post("/forgot-password", forgetPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
