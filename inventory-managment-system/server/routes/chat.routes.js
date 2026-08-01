import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireChatbotAccess } from "../middleware/chatbotAccess.middleware.js";
import {
  sendMessage,
  sendMessageStream,
  getHistory,
  listConversations,
} from "../controllers/chat.controller.js";

const router = express.Router();

// ============================================================
// Non-streaming endpoint (existing - unchanged)
// ============================================================
router.post("/message", authMiddleware, requireChatbotAccess, sendMessage);

// ============================================================
// Streaming endpoint (NEW)
// ============================================================
router.post(
  "/message/stream",
  authMiddleware,
  requireChatbotAccess,
  sendMessageStream,
);

// ============================================================
// Get conversation history (existing - unchanged)
// ============================================================
router.get(
  "/history/:conversationId",
  authMiddleware,
  requireChatbotAccess,
  getHistory,
);

// ============================================================
// List all conversations (NEW)
// ============================================================
router.get(
  "/conversations",
  authMiddleware,
  requireChatbotAccess,
  listConversations,
);

export default router;
