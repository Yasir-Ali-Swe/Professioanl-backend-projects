// routes/user.routes.js
import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.user.middleware.js";
import { uploadUser } from "../config/cloudinary.config.js";
import {
  uploadUserProfileImage,
  getUserProfile,
  updateUserProfile,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post(
  "/upload-profile-image",
  authMiddleware,
  uploadUser.single("image"),
  uploadUserProfileImage,
);

router.get("/profile", authMiddleware, getUserProfile);

router.patch("/profile", authMiddleware, updateUserProfile);

export default router;
