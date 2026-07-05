import {
  registerOrganization,
  loginUser,
  logoutUser,
  getLoginUser,
  forgetPassword,
  resetPassword,
  refreshAuth,
} from "../controllers/auth.controller.js";
import express from "express";
import { authMiddleware } from "../middleware/auht.middleware.js";

const router = express.Router();

router.post("/register-organization", registerOrganization);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/get-login-user", authMiddleware, getLoginUser);
router.post("/forget-password", forgetPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh-auth", refreshAuth);

export default router;
