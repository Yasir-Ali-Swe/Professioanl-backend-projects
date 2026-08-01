import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireChatbotAccess } from "../middleware/chatbotAccess.middleware.js";
import { sendMessage, getHistory } from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/message", authMiddleware, requireChatbotAccess, sendMessage);

router.get(
  "/history/:conversationId",
  authMiddleware,
  requireChatbotAccess,
  getHistory,
);

export default router;
