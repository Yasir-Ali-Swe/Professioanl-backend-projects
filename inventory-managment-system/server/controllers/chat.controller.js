// controllers/chat.controller.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chatTools } from "../config/chatTools.js";
import {
  executeTool,
  getResponseType,
  getToolsForRole,
} from "../services/chatTools.service.js";
import chatLogModel from "../models/chatLog.model.js";
import { GEMINI_API_KEY } from "../config/env.js";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Simple conversation context cache
const contextCache = new Map();

export const chatWithAI = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const role = req.user.role;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    // Get conversation context
    const contextKey = `${organizationId}_${userId}`;
    let context = contextCache.get(contextKey) || {
      lastQuery: null,
      lastResults: null,
      lastTool: null,
      conversationCount: 0,
    };

    // Enhance query with context if needed
    let enhancedQuery = query;
    const followUpWords = [
      "those",
      "them",
      "these",
      "that",
      "they",
      "it",
      "more",
      "again",
      "update",
      "instead",
    ];
    if (
      context.lastResults &&
      context.lastTool &&
      followUpWords.some((word) => query.toLowerCase().includes(word))
    ) {
      enhancedQuery = `${query} (Based on previous results about ${context.lastTool})`;
    }

    // Get tools based on role
    const tools = getToolsForRole(chatTools[0].functionDeclarations, role);

    // Initialize Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [{ functionDeclarations: tools }],
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(enhancedQuery);
    const call = result.response.functionCalls()?.[0];

    // If no tool called, just return text response
    if (!call) {
      const replyText = result.response.text();
      await chatLogModel.create({
        organizationId,
        userId,
        query,
        response: replyText,
        intent: null,
      });

      contextCache.set(contextKey, {
        ...context,
        lastQuery: query,
        conversationCount: context.conversationCount + 1,
      });

      return res.json({
        success: true,
        reply: replyText,
        type: "text",
        data: null,
      });
    }

    // Execute the tool
    const toolResult = await executeTool(call.name, call.args, organizationId);

    // Check for errors in tool result
    if (toolResult.error) {
      return res.json({
        success: false,
        reply:
          toolResult.message || "An error occurred processing your request",
        type: "text",
        data: null,
      });
    }

    // Send result back to AI for final response
    const followUp = await chat.sendMessage([
      {
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      },
    ]);

    const replyText = followUp.response.text();
    const responseType = getResponseType(call.name);

    // Save to history
    await chatLogModel.create({
      organizationId,
      userId,
      query,
      response: replyText,
      intent: call.name,
    });

    // Update context
    contextCache.set(contextKey, {
      lastQuery: query,
      lastResults: toolResult,
      lastTool: call.name,
      conversationCount: context.conversationCount + 1,
    });

    // Extract data for response
    const data = extractData(toolResult);

    // Build response
    const response = {
      success: true,
      reply: replyText,
      type: responseType,
      data: data,
    };

    // Add metadata if available
    if (toolResult.count !== undefined) {
      response.metadata = { count: toolResult.count };
    }
    if (toolResult.summary) {
      response.metadata = { ...response.metadata, summary: toolResult.summary };
    }

    res.json(response);
  } catch (error) {
    console.error("Error in chatWithAI:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Helper to extract data from tool result
const extractData = (toolResult) => {
  const dataKeys = [
    "products",
    "product",
    "suppliers",
    "supplier",
    "invoices",
    "orders",
    "forecasts",
    "forecast",
    "anomalies",
    "suggestions",
    "users",
    "user",
    "insight",
    "insights",
    "metrics",
    "summary",
    "topProducts",
    "inventoryValue",
    "customerAnalytics",
  ];

  for (const key of dataKeys) {
    if (toolResult[key]) return toolResult[key];
  }
  return null;
};

export const getChatHistory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const { limit = 50, intent, startDate, endDate } = req.query;

    const filter = {
      organizationId,
      userId,
    };

    if (intent) filter.intent = intent;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const history = await chatLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error in getChatHistory:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const clearContext = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const contextKey = `${organizationId}_${userId}`;
    contextCache.delete(contextKey);

    res.status(200).json({
      success: true,
      message: "Conversation context cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
