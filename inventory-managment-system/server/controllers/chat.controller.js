// controllers/chat.controller.js
import { randomUUID } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chatTools } from "../config/chatTools.js";
import {
  executeTool,
  getResponseType,
  getToolsForRole,
} from "../services/chatTools.service.js";
import chatLogModel from "../models/chatLog.model.js";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../config/env.js";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// In-memory context cache: key = `${orgId}_${userId}_${conversationId}`
const contextCache = new Map();
const FOLLOW_UP_WORDS = [
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

/**
 * Extract conversationId from request body, query, or generate a new one.
 */
const getConversationId = (req) =>
  req.body?.conversationId || req.query?.conversationId || randomUUID();

/**
 * Helper to extract structured data from tool results.
 */
const extractData = (toolResult) => {
  const dataKeys = [
    "products",
    "product",
    "suppliers",
    "supplier",
    "invoices",
    "invoice",
    "orders",
    "purchase_order",
    "forecasts",
    "forecast",
    "anomalies",
    "suggestions",
    "users",
    "user",
    "organizations",
    "organization",
    "category",
    "insights",
    "dashboard",
    "abcAnalysis",
    "deadStock",
    "groupedResults",
    "vendorPerformance",
    "customerMetrics",
    "metrics",
    "summary"
  ];
  for (const key of dataKeys) {
    if (toolResult[key]) return toolResult[key];
  }
  return null;
};

const createEmptyContext = () => ({
  lastQuery: null,
  lastResults: null,
  lastTool: null,
  conversationCount: 0,
});

const getContextKey = (organizationId, userId, conversationId) =>
  `${organizationId}_${userId}_conversation_${conversationId}`;

const getEnhancedQuery = (query, context) => {
  let enhancedQuery = query;

  if (
    context.lastResults &&
    context.lastTool &&
    FOLLOW_UP_WORDS.some((word) => query.toLowerCase().includes(word))
  ) {
    enhancedQuery = `${query} (Based on previous results of executing tool ${context.lastTool}. Previous results summary: ${JSON.stringify(context.lastResults.summary || {})})`;
  }

  return enhancedQuery;
};

const SYSTEM_INSTRUCTION = `You are StockPilot AI, the intelligent inventory management assistant built into the StockPilot platform.

IDENTITY
- Identify yourself ONLY as StockPilot AI (your inventory intelligence assistant).
- If the user asks about your identity, creator, owner, model, or developer, respond with: "I'm StockPilot AI, built by the StockPilot team to help you manage your inventory."
- NEVER mention Google Gemini, Google AI, Large Language Model, or similar AI providers unless the user asks explicitly.
- Do not introduce your self in all the responses. Only introduce your self when the user asks about your identity, creator, owner, model, or developer.

BUSINESS ANALYST ROLE
- Act as an Inventory Analyst. Do not just spit out raw records. Provide concise, high-value business insights (e.g. inventory value, highest/lowest price, margin trends, stock alerts, dead stock warnings) when presenting lists or details.
- Calculate and discuss key ratios automatically where appropriate (e.g., Profit = sellingPrice - costPrice, Margin = (sellingPrice - costPrice) / sellingPrice, Valuation = quantity * costPrice).

MARKDOWN TABLES GENERATION
- When presenting list-based datasets or summaries, and when requested (e.g. table, report, inventory, products, sales), you MUST output clean, formatted Markdown tables.
- Choose columns dynamically based on what makes business sense. For example:
  - Products: Name, SKU, Stock, Cost Price, Selling Price, Profit, Margin, Status.
  - Suppliers: Name, Contact, Email, Phone, Lead Time, Active Products.
  - Purchases: PO Number, Vendor, Items Count, Total Cost, Status.
  - Sales: Invoice Number, Customer, Status, Total.

SCOPE OF ASSISTANCE
- Your sole purpose is to help users with StockPilot workspace data: products, categories, suppliers, stock levels, stock movement history, purchase orders, invoices, sales, revenue, team members, forecasts, suggestions, anomalies, and business insights.
- Do not perform write operations (create, update, delete). If requested, decline politely and explain you are a read-only reporting assistant.
- Never leak data across tenants/organizations. Platform-wide queries are only for Super Admins. Org Admins can only query their own organization's data.

TONE
- Be professional, concise, and business-focused. Avoid repetitive preambles. Do not begin every response with "Based on your workspace". Vary your language naturally.`;

const getChatModel = (role) => {
  const tools = getToolsForRole(chatTools[0].functionDeclarations, role);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    tools: [{ functionDeclarations: tools }],
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  return { model, tools };
};

const getPlainModel = () =>
  genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

const setStreamHeaders = (res) => {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
};

const sendStreamEvent = (res, payload) => {
  if (res.writableEnded || res.destroyed) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const getFallbackReply = (toolResult) => {
  const count = toolResult.count || 0;
  const summary = toolResult.summary || {};

  return `I found ${count} results for your query. ${summary.totalValue ? `Total value: $${summary.totalValue}. ` : ""
    }Please check the data for more details.`;
};

/**
 * Chat with AI – supports conversation ID to maintain separate contexts.
 */
export const chatWithAI = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const role = req.user.role;
    const { query } = req.body;

    // Get or generate conversation ID
    const conversationId = getConversationId(req);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    // Build context key and retrieve conversation context
    const contextKey = getContextKey(organizationId, userId, conversationId);
    let context = contextCache.get(contextKey) || createEmptyContext();

    // Enhance query with previous context if it's a follow-up
    const enhancedQuery = getEnhancedQuery(query, context);

    // Get tools based on user role
    const { model } = getChatModel(role);

    const chat = model.startChat();
    const result = await chat.sendMessage(enhancedQuery);
    const call = result.response.functionCalls()?.[0];

    // If no tool called, return text response
    if (!call) {
      let replyText = result.response.text();
      if (!replyText || replyText.trim() === "") {
        replyText =
          "I understand your request, but I couldn't generate a proper response. Could you please rephrase your question?";
      }

      await chatLogModel.create({
        organizationId,
        userId,
        conversationId,
        query,
        response: replyText,
        intent: null,
      });

      contextCache.set(contextKey, {
        ...context,
        lastQuery: query,
        lastResults: null,
        lastTool: null,
        conversationCount: (context.conversationCount || 0) + 1,
      });

      return res.json({
        success: true,
        conversationId,
        reply: replyText,
        type: "text",
        data: null,
      });
    }

    // Execute the tool
    const toolResult = await executeTool(call.name, call.args, organizationId);

    if (toolResult.error) {
      return res.json({
        success: false,
        reply:
          toolResult.message || "An error occurred processing your request",
        type: "text",
        data: null,
      });
    }

    // Send function response back to Gemini for final answer
    const followUp = await chat.sendMessage([
      {
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      },
    ]);

    let replyText = followUp.response.text();
    if (!replyText || replyText.trim() === "") {
      const count = toolResult.count || 0;
      const summary = toolResult.summary || {};
      replyText = `I found ${count} results for your query. ${summary.totalValue ? `Total value: $${summary.totalValue}. ` : ""
        }Please check the data for more details.`;
    }

    const responseType = getResponseType(call.name);

    // Save to history
    await chatLogModel.create({
      organizationId,
      userId,
      conversationId,
      query,
      response: replyText,
      intent: call.name,
    });

    // Update context
    contextCache.set(contextKey, {
      lastQuery: query,
      lastResults: toolResult,
      lastTool: call.name,
      conversationCount: (context.conversationCount || 0) + 1,
    });

    const data = extractData(toolResult);

    const response = {
      success: true,
      conversationId,
      reply: replyText,
      type: responseType,
      data,
    };

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
      message:
        "I'm having trouble processing your request. Please try again or rephrase your question.",
      error: error.message,
    });
  }
};

/**
 * Chat with AI - streaming SSE endpoint.
 */
export const chatWithAIStream = async (req, res) => {
  const organizationId = req.organizationId;
  const userId = req.user._id;
  const role = req.user.role;
  const { query } = req.body;
  const conversationId = getConversationId(req);

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Query is required",
    });
  }

  setStreamHeaders(res);
  sendStreamEvent(res, {
    type: "start",
    success: true,
    conversationId,
    message: "Generating response...",
  });

  const contextKey = getContextKey(organizationId, userId, conversationId);
  const context = contextCache.get(contextKey) || createEmptyContext();
  const enhancedQuery = getEnhancedQuery(query, context);
  const { model } = getChatModel(role);
  const chat = model.startChat();

  const abortController = new AbortController();
  const handleRequestClose = () => abortController.abort();

  req.on("aborted", handleRequestClose);
  req.on("close", handleRequestClose);

  const cleanup = () => {
    req.off("aborted", handleRequestClose);
    req.off("close", handleRequestClose);
  };

  try {
    const initialResult = await chat.sendMessage(enhancedQuery, {
      signal: abortController.signal,
    });
    const call = initialResult.response.functionCalls()?.[0];

    if (!call) {
      const streamingResult = await getPlainModel().generateContentStream(
        enhancedQuery,
        {
          signal: abortController.signal,
        },
      );

      let replyText = "";

      for await (const chunk of streamingResult.stream) {
        if (abortController.signal.aborted || req.aborted || res.destroyed) {
          cleanup();
          return;
        }

        const chunkText = chunk.text();
        if (!chunkText) continue;

        replyText += chunkText;
        sendStreamEvent(res, {
          type: "chunk",
          success: true,
          content: chunkText,
        });
      }

      if (abortController.signal.aborted || req.aborted || res.destroyed) {
        cleanup();
        return;
      }

      const streamingResponse = await streamingResult.response;
      replyText = streamingResponse.text()?.trim() || replyText.trim();
      if (!replyText || replyText.trim() === "") {
        replyText =
          "I understand your request, but I couldn't generate a proper response. Could you please rephrase your question?";
      }

      await chatLogModel.create({
        organizationId,
        userId,
        conversationId,
        query,
        response: replyText,
        intent: null,
      });

      contextCache.set(contextKey, {
        ...context,
        lastQuery: query,
        lastResults: null,
        lastTool: null,
        conversationCount: (context.conversationCount || 0) + 1,
      });

      sendStreamEvent(res, {
        type: "complete",
        success: true,
        conversationId,
        reply: replyText,
        responseType: "text",
        data: null,
      });

      cleanup();
      res.end();
      return;
    }

    const toolResult = await executeTool(call.name, call.args, organizationId);

    if (toolResult.error) {
      sendStreamEvent(res, {
        type: "error",
        success: false,
        message:
          toolResult.message || "An error occurred processing your request",
      });
      cleanup();
      res.end();
      return;
    }

    sendStreamEvent(res, {
      type: "tool",
      success: true,
      name: call.name,
      data: extractData(toolResult),
    });

    const finalPrompt = `
You are StockPilot AI, the intelligent inventory management assistant built into the StockPilot platform.
Answer the user's question using the tool result below.

User question:
${query}

Tool used:
${call.name}

Tool result JSON:
${JSON.stringify(toolResult, null, 2)}

Write a concise, helpful response in plain English. Do not mention tool calls, JSON, or internal reasoning. Do not mention Google AI, Gemini, or underlying AI technology providers. Identify yourself only as StockPilot AI.
`;

    const followUpResult = await getPlainModel().generateContentStream(
      finalPrompt,
      {
        signal: abortController.signal,
      },
    );

    let replyText = "";

    for await (const chunk of followUpResult.stream) {
      if (abortController.signal.aborted || req.aborted || res.destroyed) {
        cleanup();
        return;
      }

      const chunkText = chunk.text();
      if (!chunkText) continue;

      replyText += chunkText;
      sendStreamEvent(res, {
        type: "chunk",
        success: true,
        content: chunkText,
      });
    }

    if (abortController.signal.aborted || req.aborted || res.destroyed) {
      cleanup();
      return;
    }

    const followUpResponse = await followUpResult.response;
    replyText =
      followUpResponse.text()?.trim() ||
      replyText.trim() ||
      getFallbackReply(toolResult);

    const responseType = getResponseType(call.name);
    const data = extractData(toolResult);

    await chatLogModel.create({
      organizationId,
      userId,
      conversationId,
      query,
      response: replyText,
      intent: call.name,
    });

    contextCache.set(contextKey, {
      lastQuery: query,
      lastResults: toolResult,
      lastTool: call.name,
      conversationCount: (context.conversationCount || 0) + 1,
    });

    const completePayload = {
      success: true,
      conversationId,
      reply: replyText,
      responseType,
      data,
    };

    if (toolResult.count !== undefined) {
      completePayload.metadata = { count: toolResult.count };
    }
    if (toolResult.summary) {
      completePayload.metadata = {
        ...completePayload.metadata,
        summary: toolResult.summary,
      };
    }

    sendStreamEvent(res, {
      type: "complete",
      ...completePayload,
    });

    cleanup();
    res.end();
  } catch (error) {
    cleanup();

    if (abortController.signal.aborted || req.aborted || res.destroyed) {
      return;
    }

    console.error("Error in chatWithAIStream:", error.message);
    sendStreamEvent(res, {
      type: "error",
      success: false,
      message:
        "I'm having trouble processing your request. Please try again or rephrase your question.",
      error: error.message,
    });
    res.end();
  }
};

/**
 * Get chat history – optionally filtered by conversationId.
 */
export const getChatHistory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const {
      conversationId,
      limit = 50,
      intent,
      startDate,
      endDate,
    } = req.query;

    const filter = { organizationId, userId };
    if (conversationId) filter.conversationId = conversationId;
    if (intent) filter.intent = intent;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const history = await chatLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200));

    res.status(200).json({
      success: true,
      data: history,
      conversationId: conversationId || null,
    });
  } catch (error) {
    console.error("Error in getChatHistory:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Clear conversation context – for a specific conversation or all for the user.
 */
export const clearContext = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const conversationId =
      req.body?.conversationId || req.query?.conversationId;

    if (conversationId) {
      // Delete specific conversation context
      const contextKey = `${organizationId}_${userId}_${conversationId}`;
      contextCache.delete(contextKey);
    } else {
      // Delete all contexts for this user
      const prefix = `${organizationId}_${userId}_`;
      for (const key of contextCache.keys()) {
        if (key.startsWith(prefix)) {
          contextCache.delete(key);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Conversation context cleared",
    });
  } catch (error) {
    console.error("Error in clearContext:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
