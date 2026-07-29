import express from "express";
import {
  chatWithAI,
  chatWithAIStream,
  getChatHistory,
  clearContext,
  getChatPage,
} from "../controllers/chat.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import chatLogModel from "../models/chatLog.model.js";
import { authorizeChatbotAccess } from "../middleware/featureAccess.middleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, authorizeChatbotAccess, chatWithAI);
router.post(
  "/chat/stream",
  authMiddleware,
  authorizeChatbotAccess,
  chatWithAIStream,
);
router.post(
  "/chat/page",
  authMiddleware,
  authorizeChatbotAccess,
  getChatPage,
);
router.get(
  "/chat/history",
  authMiddleware,
  authorizeChatbotAccess,
  getChatHistory,
);
router.delete(
  "/chat/context",
  authMiddleware,
  authorizeChatbotAccess,
  clearContext,
);

router.get(
  "/chat/analytics",
  authMiddleware,
  authorizeChatbotAccess,
  async (req, res) => {
    try {
      const organizationId = req.organizationId;
      const userId = req.user._id;

      const stats = await chatLogModel.aggregate([
        { $match: { organizationId, userId } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$intent",
            count: { $sum: 1 },
            lastQuery: { $first: "$query" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      res.json({
        success: true,
        data: stats,
        totalQueries: stats.reduce((sum, s) => sum + s.count, 0),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

export default router;
