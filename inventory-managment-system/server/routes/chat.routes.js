// routes/chat.routes.js
import express from "express";
import { 
  chatWithAI, 
  getChatHistory,
  clearContext 
} from "../controllers/chat.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();


router.post("/chat", authMiddleware, chatWithAI);


router.get("/chat/history", authMiddleware, getChatHistory);


router.delete("/chat/context", authMiddleware, clearContext);


router.get("/chat/analytics", authMiddleware, async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    
    const stats = await chatLogModel.aggregate([
      { $match: { organizationId, userId } },
      { $group: {
        _id: "$intent",
        count: { $sum: 1 },
        lastQuery: { $last: "$query" }
      }},
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: stats,
      totalQueries: stats.reduce((sum, s) => sum + s.count, 0)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;