// routes/chat.routes.js
import express from "express";
import { chatWithAI, getChatHistory } from "../controllers/chat.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, chatWithAI);
router.get("/chat/history", authMiddleware, getChatHistory);

export default router;
