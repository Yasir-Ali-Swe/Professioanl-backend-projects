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

    const tools = getToolsForRole(chatTools[0].functionDeclarations, role);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [{ functionDeclarations: tools }],
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(query);
    const call = result.response.functionCalls()?.[0];

    if (!call) {
      const replyText = result.response.text();
      await chatLogModel.create({
        organizationId,
        userId,
        query,
        response: replyText,
        intent: null,
      });
      return res.json({
        success: true,
        reply: replyText,
        type: "text",
        data: null,
      });
    }

    const toolResult = await executeTool(call.name, call.args, organizationId);

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

    await chatLogModel.create({
      organizationId,
      userId,
      query,
      response: replyText,
      intent: call.name,
    });

    res.json({
      success: true,
      reply: replyText,
      type: responseType,
      data:
        toolResult.products ||
        toolResult.product ||
        toolResult.orders ||
        toolResult.invoices ||
        toolResult.suggestions ||
        toolResult.anomalies ||
        toolResult.users ||
        toolResult.suppliers ||
        toolResult.logs ||
        toolResult.forecast ||
        toolResult.insight ||
        toolResult.categories ||
        toolResult.supplier ||
        null,
    });
  } catch (error) {
    console.error("Error in chatWithAI:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;

    const history = await chatLogModel
      .find({
        organizationId,
        userId,
      })
      .sort({ createdAt: -1 })
      .limit(50);

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
