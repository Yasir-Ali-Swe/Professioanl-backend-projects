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
import { CONSTANTS } from "../config/constants.js";
import { verifyChatbotAccessPermission } from "../middleware/featureAccess.middleware.js";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

class ContextCache {
  constructor() {
    this.cache = new Map();
    this.ttl = CONSTANTS.CONTEXT_CACHE_TTL * 1000;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clearByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const contextCache = new ContextCache();
setInterval(() => contextCache.cleanup(), 5 * 60 * 1000);

const getConversationId = (req) =>
  req.body?.conversationId || req.query?.conversationId || randomUUID();

const extractData = (toolResult) => {
  if (!toolResult) return null;

  if (toolResult.data && toolResult.fields) {
    return {
      data: toolResult.data,
      fields: toolResult.fields,
      count: toolResult.count,
      tableTitle: toolResult.tableTitle || "Results",
    };
  }

  if (toolResult.isDashboard && toolResult.dashboard) {
    return toolResult.dashboard;
  }

  if (toolResult.invoice?.lineItems) return toolResult.invoice.lineItems;
  if (toolResult.purchaseOrder?.lineItems)
    return toolResult.purchaseOrder.lineItems;
  if (toolResult.supplier?.productsList)
    return toolResult.supplier.productsList;
  if (toolResult.category?.productsList)
    return toolResult.category.productsList;
  if (toolResult.summary?.customerProductsPurchased)
    return toolResult.summary.customerProductsPurchased;
  if (toolResult.groupedResults) return toolResult.groupedResults;

  if (toolResult.target === "users" && toolResult.users)
    return toolResult.users;
  if (toolResult.target === "categories" && toolResult.categories)
    return toolResult.categories;
  if (toolResult.target === "suppliers" && toolResult.suppliers)
    return toolResult.suppliers;

  if (toolResult.users && !toolResult.categories && !toolResult.suppliers) {
    return toolResult.users;
  }

  if (
    toolResult.target === "overview" ||
    toolResult.organizationInfo ||
    (toolResult.categories && toolResult.suppliers && toolResult.users)
  ) {
    return null;
  }

  for (const key of CONSTANTS.DATA_KEYS) {
    if (toolResult[key]) return toolResult[key];
  }
  return null;
};

const createEmptyContext = () => ({
  lastQuery: null,
  lastResults: null,
  lastTool: null,
  conversationCount: 0,
  organizationId: null,
  lastPage: 1,
  lastFilters: null,
  activeEntity: null,
});

const getContextKey = (organizationId, userId, conversationId) => {
  const orgPart = organizationId || "super_admin";
  return `${orgPart}_${userId}_conversation_${conversationId}`;
};

const buildFollowUpContext = (lastResults, lastTool) => {
  if (!lastResults) return "{}";

  if (lastResults.summary && Object.keys(lastResults.summary).length > 0) {
    return JSON.stringify(lastResults.summary);
  }

  const primaryKeys = [
    "products",
    "invoices",
    "orders",
    "transactions",
    "anomalies",
    "suggestions",
    "users",
    "organizations",
    "forecasts",
    "groupedResults",
    "deadStock",
    "dashboard",
  ];
  const fallback = {
    count: lastResults.count || 0,
    tool: lastTool,
    sample: [],
  };

  for (const key of primaryKeys) {
    if (Array.isArray(lastResults[key]) && lastResults[key].length > 0) {
      fallback.sample = lastResults[key].slice(0, 3);
      break;
    }
  }
  return JSON.stringify(fallback);
};

const getEnhancedQuery = (query, context) => {
  let enhancedQuery = query;
  const lowerQuery = query.toLowerCase();

  const isFollowUpWord = CONSTANTS.FOLLOW_UP_WORDS.some((word) =>
    lowerQuery.includes(word.toLowerCase()),
  );

  const isEntityPronoun =
    /\b(it|this|that|these|those|its|their|them|the same)\b/i.test(lowerQuery);

  if (context.activeEntity && (isFollowUpWord || isEntityPronoun)) {
    const activeInfo = JSON.stringify({
      type: context.activeEntity.type,
      identifier: context.activeEntity.identifier,
      summary:
        context.activeEntity.data?.invoice?.general ||
        context.activeEntity.data?.purchaseOrder?.general ||
        context.activeEntity.data?.supplier?.info ||
        context.activeEntity.data?.product?.general ||
        {},
    });
    enhancedQuery = `${query} (Background reference entity: ${activeInfo}. NOTE: Do NOT apply or reuse filters unless explicitly requested in: "${query}")`;
  } else if (context.lastResults && context.lastTool && isFollowUpWord) {
    const contextSnippet = buildFollowUpContext(
      context.lastResults,
      context.lastTool,
    );
    enhancedQuery = `${query} (Background reference from previous tool ${context.lastTool}: ${contextSnippet}. NOTE: Do NOT apply or reuse filters like supplier, category, or status unless explicitly requested in: "${query}")`;
  }

  return enhancedQuery;
};

const isSimpleQuery = (query = "") => {
  const lower = String(query || "").toLowerCase().trim();
  const simplePatterns = [
    /who\s+(is|are)\s+(the\s+)?admin/i,
    /admin\s+(profile|user|email|name|info)/i,
    /admin\s+profile/i,
    /show\s+(me\s+)?(the\s+)?admin/i,
    /what\s+is\s+(the\s+)?(name\s+of\s+our\s+)?org(anization)?(\s+name)?/i,
    /org(anization)?\s+name/i,
    /company\s+name/i,
    /tax\s+rate/i,
    /default\s+discount/i,
    /invoice\s+prefix/i,
    /what\s+is\s+(the\s+)?invoice\s+prefix/i,
    /how\s+many\s+suppliers/i,
    /supplier\s+count/i,
    /how\s+many\s+products/i,
    /product\s+count/i,
    /subscription\s+plan/i,
    /what\s+subscription/i,
    /show\s+subscription/i,
  ];
  return simplePatterns.some((pattern) => pattern.test(lower));
};

const extractSuggestedQuestions = (reply, userQuery = "") => {
  if (!reply || isSimpleQuery(userQuery)) return [];

  let rawLines = [];
  const match = reply.match(
    /💬\s*SUGGESTED QUESTIONS[\s\S]*?\n([\s\S]*?)(?=\n#{1,6}\s|\n💬|\n📦|\n📊|\n💡|\n🎯|$)/i,
  );

  if (match && match[1]) {
    rawLines = match[1]
      .split("\n")
      .map((line) =>
        line
          .replace(/^[\d]+\.\s*/, "")
          .replace(/^[•\-*]\s*/, "")
          .trim(),
      )
      .filter((q) => q.length > 5);
  } else {
    const fallback = reply.match(
      /💬\s*SUGGESTED QUESTIONS[^\n]*\n((?:[ \t]*(?:[•\-*]|\d+\.)[^\n]+\n?)+)/i,
    );
    if (fallback && fallback[1]) {
      rawLines = fallback[1]
        .split("\n")
        .map((line) =>
          line
            .replace(/^[\d]+\.\s*/, "")
            .replace(/^[•\-*]\s*/, "")
            .trim(),
        )
        .filter((q) => q.length > 5);
    }
  }

  if (rawLines.length === 0) return [];

  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const userNorm = normalize(userQuery);
  const userWords = new Set(
    userNorm
      .split(" ")
      .filter(
        (w) =>
          w.length > 3 &&
          ![
            "show",
            "list",
            "what",
            "which",
            "with",
            "have",
            "from",
            "that",
            "this",
            "items",
            "products",
            "please",
          ].includes(w),
      ),
  );

  const seenNorms = new Set();
  const filtered = [];
  for (const q of rawLines) {
    const qNorm = normalize(q);
    if (!qNorm || qNorm.length < 8) continue;
    if (qNorm === userNorm) continue;
    if (userNorm && (qNorm.includes(userNorm) || userNorm.includes(qNorm)))
      continue;
    if (seenNorms.has(qNorm)) continue;

    const qWords = qNorm
      .split(" ")
      .filter(
        (w) =>
          w.length > 3 &&
          ![
            "show",
            "list",
            "what",
            "which",
            "with",
            "have",
            "from",
            "that",
            "this",
            "items",
            "products",
            "please",
            "details",
            "invoice",
          ].includes(w),
      );
    if (qWords.length > 0 && userWords.size > 0) {
      const matchCount = qWords.filter((w) => userWords.has(w)).length;
      const overlapRatio = matchCount / Math.max(qWords.length, 1);
      if (overlapRatio > 0.6) {
        continue;
      }
    }

    seenNorms.add(qNorm);
    filtered.push(q);
  }

  return filtered;
};

const SYSTEM_INSTRUCTION = `You are StockPilot AI, an Inventory Analyst for StockPilot.

IDENTITY & TONE:
- Identify as "StockPilot AI" only when asked about your identity.
- Never mention Google, Gemini, LLM, or AI providers.
- Write like a knowledgeable, helpful colleague. Short, direct sentences.

ROLE-BASED ACCESS:
- Admin: Can only access their organization's data.
- Super Admin: Can access all organizations.
- Both roles have READ-ONLY permissions. Politely refuse write requests in 1-2 plain sentences without headers.

RESPONSE FORMAT:
For simple queries (e.g., organization name, tax rate, subscription details):
- Respond with ONLY the direct answer in 1-2 plain sentences.
- DO NOT include Markdown headers (like ## 📦 SUMMARY).
- DO NOT include insights or recommendations.

For plain list/record lookups (when isAnalytical is false, e.g. "show all products", "show all invoices", "show all suppliers", "show all categories", "show all users"):
- Provide ONLY:
  1. ## 📦 SUMMARY (Key metrics as bullet points)
  2. ## 📊 PRIMARY CONTENT (State "Data is displayed in the table below.")
- NEVER include ## 💡 AI INSIGHTS or ## 🎯 RECOMMENDATIONS for plain list lookups.

For analytical queries (when isAnalytical is true, e.g. profit margins, ABC analysis, demand forecasts, anomaly reports, performance breakdowns):
- Use this exact order:
  1. ## 📦 SUMMARY (Key metrics as bullet points)
  2. ## 📊 PRIMARY CONTENT (State "Data is displayed in the table below.")
  3. ## 💡 AI INSIGHTS (2-3 comparative observations)
  4. ## 🎯 RECOMMENDATIONS (2-3 actionable steps)

CRITICAL RULE - NEVER GENERATE TABLES:
- You MUST NEVER generate markdown tables using pipes (|) and dashes (---).
- The table data will be rendered separately by the frontend.
- Only provide text summaries, insights, and recommendations.
- Under PRIMARY CONTENT, just state "Data is displayed in the table below."

HARD STOP: Stop after completing response. No wrap-up or restatement.`;

const trimToolResult = (result) => {
  if (!result || typeof result !== "object") return result;
  if (
    result.page !== undefined ||
    result.totalPages !== undefined ||
    result.showingRange !== undefined
  ) {
    return result;
  }
  const trimmed = { ...result };

  for (const [key, value] of Object.entries(trimmed)) {
    if (CONSTANTS.SUMMARY_KEYS.has(key)) continue;

    if (Array.isArray(value) && value.length > CONSTANTS.MAX_ARRAY_ITEMS) {
      trimmed[`${key}TotalCount`] = value.length;
      trimmed[key] = value.slice(0, CONSTANTS.MAX_ARRAY_ITEMS);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      trimmed[key] = trimToolResult(value);
    }
  }
  return trimmed;
};

const detectSchema = (query, toolName, data) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const lowerQuery = (query || "").toLowerCase();

  if (
    lowerQuery.includes("profit") ||
    lowerQuery.includes("margin") ||
    lowerQuery.includes("profitability")
  ) {
    if (toolName === "query_inventory") {
      return "products_detailed";
    }
  }

  if (
    lowerQuery.includes("detail") ||
    lowerQuery.includes("complete") ||
    lowerQuery.includes("full info") ||
    lowerQuery.includes("comprehensive")
  ) {
    return "products_detailed";
  }

  if (toolName === "get_details") {
    const sample = Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (sample.unitPrice !== undefined && sample.quantity !== undefined)
      return "invoice_items";
    if (sample.unitCost !== undefined && sample.totalCost !== undefined)
      return "po_items";
    if (
      sample.quantityPurchased !== undefined &&
      sample.totalSpent !== undefined
    )
      return "customer_purchases";
    if (sample.costPrice !== undefined && sample.sellingPrice !== undefined)
      return "products_compact";
  }

  if (toolName === "query_sales") {
    const sample = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (sample && sample.quantityPurchased !== undefined)
      return "customer_purchases";
    return "sales";
  }

  if (toolName === "query_inventory") {
    const isDetailed =
      lowerQuery.includes("detail") ||
      lowerQuery.includes("complete") ||
      lowerQuery.includes("all field") ||
      lowerQuery.includes("every field") ||
      lowerQuery.includes("full info") ||
      lowerQuery.includes("cost price") ||
      lowerQuery.includes("profit") ||
      lowerQuery.includes("margin") ||
      lowerQuery.includes("valuation") ||
      lowerQuery.includes("supplier") ||
      lowerQuery.includes("category");

    if (lowerQuery.includes("profit") || lowerQuery.includes("margin")) {
      return "products_detailed";
    }

    return isDetailed ? "products_detailed" : "products_compact";
  }

  if (toolName === "query_purchases") return "purchases";
  if (toolName === "query_transactions") {
    const sample = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (
      sample &&
      (sample.role !== undefined ||
        sample.roleDisplay !== undefined ||
        sample.userName !== undefined ||
        sample.typeDisplay !== undefined ||
        sample.transactionCount !== undefined)
    ) {
      return "transactions_grouped";
    }
    return "transactions";
  }
  if (toolName === "query_organization") {
    const sample = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (sample && (sample.role !== undefined || sample.email !== undefined)) {
      return "users";
    }
    if (
      sample &&
      (sample.roleDisplay !== undefined || sample.userCount !== undefined)
    ) {
      return "grouped_roles";
    }
    if (
      sample &&
      sample.contactEmail !== undefined &&
      sample.salesValue !== undefined
    ) {
      return "organizations";
    }
    return "organization_overview";
  }
  if (toolName === "query_insights") {
    if (Array.isArray(data) && data.length > 0) {
      const sample = data[0];
      if (sample.predictedDemand !== undefined) return "forecast";
      if (sample.severityDisplay !== undefined || sample.severity !== undefined)
        return "anomalies";
      if (sample.suggestedReorderQuantity !== undefined) return "suggestions";
      if (sample.daysWithoutSale !== undefined) return "deadStock";
    }
  }

  return null;
};

const getChatModel = (role) => {
  const tools = getToolsForRole(chatTools[0].functionDeclarations, role);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    tools: [{ functionDeclarations: tools }],
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  return { model, tools };
};

const getPlainModel = () =>
  genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
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
  return `## 📦 SUMMARY
- Found ${count} results for your query.
- Total value: PKR ${formatCurrency(summary.totalValue || 0)}

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- No additional insights available.

## 🎯 RECOMMENDATIONS
- Please refine your query for more specific recommendations.

💬 SUGGESTED QUESTIONS:
- Try asking "Show me more details about these products"
- Try asking "Which products are low in stock?"`;
};

const formatCurrency = (value) => {
  return Number(value).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ============ CHAT WITH AI (Non-Streaming) ============

export const chatWithAI = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const role = req.user.role;
    const { query } = req.body;

    const permCheck = await verifyChatbotAccessPermission(req.user, organizationId);
    if (!permCheck.allowed) {
      return res.status(permCheck.status || 403).json({
        success: false,
        message: permCheck.message,
        upgradeRequired: permCheck.upgradeRequired || false,
      });
    }

    const conversationId = getConversationId(req);

    console.log("Received query:", query);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Query is too long (maximum 500 characters)",
      });
    }

    const contextKey = getContextKey(organizationId, userId, conversationId);
    let context = contextCache.get(contextKey) || createEmptyContext();

    if (organizationId) {
      context.organizationId = organizationId;
    }

    const enhancedQuery = getEnhancedQuery(query, context);
    const { model } = getChatModel(role);

    const chat = model.startChat();
    const result = await chat.sendMessage(enhancedQuery);
    const call = result.response.functionCalls()?.[0];

    if (!call) {
      let replyText = result.response.text();
      if (!replyText || replyText.trim() === "") {
        replyText =
          "I understand your request, but I couldn't generate a proper response. Could you please rephrase your question?";
      }

      const suggestedQuestions = extractSuggestedQuestions(replyText);

      await chatLogModel.create({
        organizationId,
        userId,
        conversationId,
        query,
        response: replyText,
        intent: null,
        metadata: { suggestedQuestions },
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
        suggestedQuestions,
      });
    }

    const toolResult = await executeTool(
      call.name,
      call.args,
      organizationId,
      role,
      null,
      query,
    );

    if (toolResult.error) {
      return res.json({
        success: false,
        reply:
          toolResult.message || "An error occurred processing your request",
        type: "text",
        data: null,
      });
    }

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
      replyText = getFallbackReply(toolResult);
    }

    const responseType = getResponseType(call.name);
    const suggestedQuestions = extractSuggestedQuestions(replyText);

    const paginationMeta =
      toolResult.page !== undefined
        ? {
          page: toolResult.page,
          totalPages: toolResult.totalPages,
          count: toolResult.count,
        }
        : null;

    const extractedData = extractData(toolResult);
    let tableData = null;
    let fields = null;
    let tableTitle = "Results";

    if (extractedData) {
      if (extractedData.data && extractedData.fields) {
        tableData = extractedData.data;
        fields = extractedData.fields;
        tableTitle = extractedData.tableTitle || "Results";
      } else {
        tableData = extractedData;
      }
    }

    if (toolResult.data && toolResult.fields) {
      tableData = toolResult.data;
      fields = toolResult.fields;
      tableTitle = toolResult.tableTitle || "Results";
    }

    if (toolResult.isDashboard) {
      tableData = toolResult.dashboard;
    }

    await chatLogModel.create({
      organizationId,
      userId,
      conversationId,
      query,
      response: replyText,
      intent: call.name,
      metadata: {
        toolName: call.name,
        toolArgs: call.args ? JSON.parse(JSON.stringify(call.args)) : {},
        suggestedQuestions,
        pagination: paginationMeta,
        tableData: tableData,
        fields: fields,
        tableTitle: tableTitle,
      },
    });

    if (toolResult.page !== undefined) {
      context.lastPage = toolResult.page;
    }
    if (toolResult.filters) {
      context.lastFilters = toolResult.filters;
    }

    contextCache.set(contextKey, {
      ...context,
      lastQuery: query,
      lastResults: toolResult,
      lastTool: call.name,
      conversationCount: (context.conversationCount || 0) + 1,
    });
    console.log("tableData:", tableData);
    const response = {
      success: true,
      conversationId,
      reply: replyText,
      type: responseType,
      data: tableData,
      fields: fields,
      tableTitle: tableTitle,
      suggestedQuestions,
    };

    if (paginationMeta) {
      response.metadata = paginationMeta;
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
    });
  }
};

// ============ CHAT WITH AI STREAM (SSE) ============

export const chatWithAIStream = async (req, res) => {
  const organizationId = req.organizationId;
  const userId = req.user._id;
  const role = req.user.role;
  const { query } = req.body;
  const conversationId = getConversationId(req);

  const permCheck = await verifyChatbotAccessPermission(req.user, organizationId);
  if (!permCheck.allowed) {
    return res.status(permCheck.status || 403).json({
      success: false,
      message: permCheck.message,
      upgradeRequired: permCheck.upgradeRequired || false,
    });
  }

  if (!query || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Query is required",
    });
  }

  if (query.length > 500) {
    return res.status(400).json({
      success: false,
      message: "Query is too long (maximum 500 characters)",
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

  if (organizationId) {
    context.organizationId = organizationId;
  }

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

      const suggestedQuestions = extractSuggestedQuestions(replyText);

      await chatLogModel.create({
        organizationId,
        userId,
        conversationId,
        query,
        response: replyText,
        intent: null,
        metadata: { suggestedQuestions },
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
        suggestedQuestions,
      });

      cleanup();
      res.end();
      return;
    }

    const lastLog = await chatLogModel.findOne({ conversationId, userId }).sort({ createdAt: -1 }).lean();
    const previousMetadata = lastLog?.metadata || null;

    const toolResult = await executeTool(
      call.name,
      call.args,
      organizationId,
      role,
      previousMetadata,
      query,
    );

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

    const extractedData = extractData(toolResult);
    let tableData = null;
    let fields = null;
    let tableTitle = "Results";

    if (extractedData) {
      if (extractedData.data && extractedData.fields) {
        tableData = extractedData.data;
        fields = extractedData.fields;
        tableTitle = extractedData.tableTitle || "Results";
      } else {
        tableData = extractedData;
      }
    }

    if (toolResult.data && toolResult.fields) {
      tableData = toolResult.data;
      fields = toolResult.fields;
      tableTitle = toolResult.tableTitle || "Results";
    }

    if (toolResult.isDashboard) {
      tableData = toolResult.dashboard;
      tableTitle = "Dashboard";
    }

    const schema = detectSchema(query, call.name, tableData);

    sendStreamEvent(res, {
      type: "tool",
      success: true,
      name: call.name,
      data: tableData,
      fields: fields,
      tableTitle: tableTitle,
      schema: schema,
    });

    const classifyIntent = (query = "", toolName = "", toolResult = {}) => {
      const lower = query.toLowerCase();

      if (
        lower.includes("product") ||
        lower.includes("item") ||
        lower.includes("line item") ||
        lower.includes("included") ||
        lower.includes("purchased")
      ) {
        if (
          toolName === "get_details" ||
          toolName === "query_sales" ||
          toolName === "query_purchases"
        ) {
          return "LINE_ITEMS";
        }
      }

      if (
        lower.includes("detail") ||
        lower.includes("profile") ||
        lower.includes("information") ||
        lower.includes("who created") ||
        lower.includes("customer info") ||
        lower.includes("payment info") ||
        lower.includes("tax") ||
        lower.includes("discount")
      ) {
        if (toolName === "get_details") {
          return "ENTITY_DETAILS";
        }
      }

      if (
        toolName === "query_transactions" &&
        (toolResult.groupedResults ||
          (Array.isArray(toolResult.transactions) &&
            toolResult.transactions.length > 0 &&
            (toolResult.transactions[0].roleDisplay !== undefined ||
              toolResult.transactions[0].userName !== undefined ||
              toolResult.transactions[0].typeDisplay !== undefined ||
              toolResult.transactions[0].transactionCount !== undefined)))
      ) {
        return "GROUPED_TRANSACTIONS";
      }

      if (
        lower.includes("team member") ||
        lower.includes("user") ||
        lower.includes("who is the admin") ||
        lower.includes("show me the roles") ||
        toolResult.target === "users"
      ) {
        if (
          lower.includes("group") ||
          lower.includes("role") ||
          toolResult.groupedResults
        ) {
          return "GROUPED_ROLES";
        }
        return "TEAM_MEMBERS";
      }

      if (
        lower.includes("customer") ||
        toolResult.summary?.customerProductsPurchased
      ) {
        return "CUSTOMER_PROFILE";
      }

      if (
        lower.includes("organization") ||
        lower.includes("company") ||
        lower.includes("our org") ||
        toolName === "query_organization"
      ) {
        return "ORGANIZATION_OVERVIEW";
      }

      if (
        lower.includes("dead stock") ||
        lower.includes("low stock") ||
        lower.includes("forecast") ||
        lower.includes("anomaly") ||
        lower.includes("suggestion") ||
        lower.includes("performance") ||
        lower.includes("risk") ||
        lower.includes("insight") ||
        toolName === "query_insights"
      ) {
        return "ANALYTICS_RISK";
      }

      return "LISTING_COMPACT";
    };

    const buildDynamicPrompt = (query, toolName, trimmedResult) => {
      const intent = classifyIntent(query, toolName, trimmedResult);
      const dataJson = JSON.stringify(trimmedResult, null, 2);

      // Check for simple queries
      if (isSimpleQuery(query)) {
        return `You are StockPilot AI, an Inventory Analyst.

User question: ${query}

Tool result JSON:
${dataJson}

INSTRUCTIONS:
1. Respond with ONLY the direct answer in 1-2 plain sentences.
2. DO NOT include Markdown headers (like ## 📦 SUMMARY).
3. DO NOT include table data or empty sections.
4. Keep it concise and natural.
5. If the answer is in the data, extract and present it directly.`;
      }

      if (
        trimmedResult?.isUnsupported === true ||
        trimmedResult?.error === true
      ) {
        const msg =
          trimmedResult?.message ||
          "Requested feature or entity type is not supported.";
        return `You are StockPilot AI, an Inventory Analyst.
User question: ${query}

Tool error/unsupported details:
${dataJson}

INSTRUCTIONS:
1. Respond in 1–2 plain, natural sentences explaining clearly that "${msg}".
2. State 2–3 related inventory queries that the system CAN answer instead.
3. CRITICAL: DO NOT output Markdown headers (like ## 📦 SUMMARY), DO NOT output markdown tables, DO NOT output empty bullet template sections.`;
      }

      const isEmpty =
        trimmedResult?.summary?.isEmpty === true ||
        (Array.isArray(trimmedResult?.data) &&
          trimmedResult.data.length === 0 &&
          Array.isArray(trimmedResult?.products) &&
          trimmedResult.products.length === 0 &&
          Array.isArray(trimmedResult?.invoices) &&
          trimmedResult.invoices.length === 0);

      if (isEmpty) {
        const isPositiveCheck =
          query.toLowerCase().includes("out of stock") ||
          query.toLowerCase().includes("dead stock") ||
          query.toLowerCase().includes("anomalies");
        let emptyInstruction = "";

        if (isPositiveCheck) {
          emptyInstruction = `
INTENT: The user checked for items/issues (e.g. out of stock/dead stock/anomalies), but 0 items match.
INSTRUCTIONS:
1. Respond in 1–2 clear, encouraging natural sentences stating that there are 0 matching items/issues at this time.
2. DO NOT output Markdown headers (like ## 📦 SUMMARY), DO NOT output empty markdown tables or zero-value summaries.
3. Suggest 2-3 logical follow-up questions directly.`;
        } else {
          emptyInstruction = `
INTENT: No matching records found for user query.
INSTRUCTIONS:
1. Respond in 1–2 polite natural sentences stating that no records match "${query}".
2. Suggest 2-3 specific adjustments or alternative queries.
3. DO NOT output Markdown headers (like ## 📦 SUMMARY), DO NOT output empty markdown tables or zero-value summaries.`;
        }

        return `You are StockPilot AI, an Inventory Analyst.
User question: ${query}

Tool result JSON:
${dataJson}

${emptyInstruction}
Write in short, direct, friendly sentences.`;
      }

      const showingRangeText = trimmedResult?.showingRange
        ? `PAGINATION RANGE RULE: Include the exact stated range: "${trimmedResult.showingRange}" in the SUMMARY section.`
        : "";

      const isAnalytical = trimmedResult?.isAnalytical === true;
      let instructions = "";

      if (!isAnalytical) {
        instructions = `
INTENT: Plain record/list lookup query.
RULES:
1. Provide a concise summary metric list under "## 📦 SUMMARY". Include ${showingRangeText}.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. Under "## 📊 PRIMARY CONTENT", state "Data is displayed in the table below."
4. CRITICAL MANDATORY RULE: NEVER include "## 💡 AI INSIGHTS" or "## 🎯 RECOMMENDATIONS" sections in your response. Plain record lookups must NEVER receive insights or recommendations.

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics & summary)

## 📊 PRIMARY CONTENT
Data is displayed in the table below.
`;
      } else if (intent === "LINE_ITEMS") {
        instructions = `
INTENT: The user wants to see specific line items or products within an invoice or purchase order.

RULES:
1. Answer the user's specific request FIRST. Provide a clean summary overview.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. Just state "Data is displayed in the table below." under PRIMARY CONTENT.
4. ${showingRangeText}

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics and range)

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- (2-3 observations grounded strictly in the tool result data)
`;
      } else if (intent === "ENTITY_DETAILS") {
        instructions = `
INTENT: Comprehensive details/profile for an entity (Invoice, PO, Supplier, Category, User, or Org).

RULES:
1. Present general information metrics under "## ℹ️ GENERAL INFORMATION" as bullet points.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. ${showingRangeText}

REQUIRED LAYOUT:
## ℹ️ GENERAL INFORMATION
- (Entity attributes as bullet points)

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- (2-3 observations grounded strictly in the tool result data)

## 🎯 RECOMMENDATIONS
- (2-3 recommendations grounded strictly in the tool result data)
`;
      } else if (intent === "CUSTOMER_PROFILE") {
        instructions = `
INTENT: Customer spending info or purchased items.

RULES:
1. Present customer spend metrics FIRST under "## 👤 CUSTOMER PROFILE".
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. ${showingRangeText}

REQUIRED LAYOUT:
## 👤 CUSTOMER PROFILE
- Customer Name: ...
- Total Spent: PKR ...

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- (2-3 observations grounded strictly in the tool result data)
`;
      } else if (intent === "GROUPED_TRANSACTIONS") {
        instructions = `
INTENT: Grouped stock transactions (by role, user, type, or reason).

RULES:
1. Under "## 📦 SUMMARY", present total transaction groups and total volume.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. Provide 2-3 analytical observations under "## 💡 AI INSIGHTS".
4. Provide 2-3 actionable next steps under "## 🎯 RECOMMENDATIONS".

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics)

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- (2-3 observations)

## 🎯 RECOMMENDATIONS
- (2-3 recommendations)
`;
      } else if (intent === "GROUPED_ROLES") {
        instructions = `
INTENT: Group team members/users by role.

RULES:
1. Under "## 📦 SUMMARY", present total users, active users, and role counts.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. Provide 2-3 analytical observations under "## 💡 AI INSIGHTS".
4. Provide 2-3 strategic next steps under "## 🎯 RECOMMENDATIONS".

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics)

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- (2-3 observations)

## 🎯 RECOMMENDATIONS
- (2-3 recommendations)
`;
      } else if (intent === "TEAM_MEMBERS") {
        instructions = `
INTENT: Show organization team members / users.

RULES:
1. Under "## 📦 SUMMARY", list total users, active users, and roles breakdown.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics)

## 📊 PRIMARY CONTENT
Data is displayed in the table below.
`;
      } else if (intent === "ORGANIZATION_OVERVIEW") {
        instructions = `
INTENT: Full organization overview including categories, suppliers, users/team members, and performance metrics.

RULES:
1. Under "## 📦 SUMMARY", list total users, active users, total categories, total suppliers, total products, and total revenue.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. Provide 2-3 analytical observations under "## 💡 AI INSIGHTS".
4. Provide 2-3 strategic next steps under "## 🎯 RECOMMENDATIONS".

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics)

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- (2-3 observations)

## 🎯 RECOMMENDATIONS
- (2-3 recommendations)
`;
      } else if (intent === "LISTING_COMPACT") {
        instructions = `
INTENT: Product list or entity listing overview.

RULES:
1. Provide quick metric summary under "## 📦 SUMMARY". Include ${showingRangeText}.
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. Just state "Data is displayed in the table below." under PRIMARY CONTENT.

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Summary metrics & pagination range)
- Total Stock: [total stock quantity]

## 📊 PRIMARY CONTENT
Data is displayed in the table below.
`;
      } else {
        instructions = `
INTENT: Strategic analytical inquiry (Dead stock, stockout risk, forecasts, anomalies, overall summaries).

RULES:
1. Provide a comprehensive summary under "## 📦 SUMMARY". ${showingRangeText}
2. CRITICAL: DO NOT generate markdown tables. The table data will be rendered separately.
3. Just state "Data is displayed in the table below." under PRIMARY CONTENT.
4. Provide 2-4 actionable insights under "## 💡 AI INSIGHTS".
5. Provide 2-4 strategic actions under "## 🎯 RECOMMENDATIONS".

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics & pagination range)
- Total Stock: [total stock quantity]

## 📊 PRIMARY CONTENT
Data is displayed in the table below.

## 💡 AI INSIGHTS
- (Comparative observations)

## 🎯 RECOMMENDATIONS
- (Actionable steps)
`;
      }

      return `You are StockPilot AI, an Inventory Analyst. Answer using ONLY the tool result data below. Never invent or estimate numbers.

User question: ${query}

Tool result JSON:
${dataJson}

${instructions}

CRITICAL FORMATTING RULES:
- Headers MUST start with '## ' (e.g. ## 📦 SUMMARY, ## 📊 PRIMARY CONTENT, ## 💡 AI INSIGHTS, ## 🎯 RECOMMENDATIONS)
- Format currency as PKR 1,234,567.00
- Format percentages as 43%
- Each bullet point MUST start with "- " on its OWN SEPARATE LINE.
- DO NOT use Unicode bullet symbols (like •).
- NEVER generate markdown tables using pipes (|) and dashes (---).
- Write like a knowledgeable colleague. Short, direct sentences.
- ALWAYS include Total Stock in the SUMMARY section.`;
    };

    const trimmedResult = trimToolResult(toolResult);
    const finalPrompt = buildDynamicPrompt(query, call.name, trimmedResult);

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
    const suggestedQuestions = extractSuggestedQuestions(replyText, query);

    const paginationMeta =
      toolResult.page !== undefined
        ? {
          page: toolResult.page,
          totalPages: toolResult.totalPages,
          count: toolResult.count,
          pageSize: toolResult.pageSize || CONSTANTS.DEFAULT_PAGE_LIMIT,
          showingRange: toolResult.showingRange,
        }
        : null;

    let finalTableData = tableData;
    let finalFields = fields;
    let finalTableTitle = tableTitle;

    if (!finalTableData && extractedData) {
      if (extractedData.data && extractedData.fields) {
        finalTableData = extractedData.data;
        finalFields = extractedData.fields;
        finalTableTitle = extractedData.tableTitle || "Results";
      } else {
        finalTableData = extractedData;
      }
    }

    if (!finalTableData && toolResult.data) {
      finalTableData = toolResult.data;
      if (toolResult.fields) {
        finalFields = toolResult.fields;
      }
      finalTableTitle = toolResult.tableTitle || "Results";
    }

    await chatLogModel.create({
      organizationId,
      userId,
      conversationId,
      query,
      response: replyText,
      intent: call.name,
      metadata: {
        toolName: call.name,
        toolArgs: call.args ? JSON.parse(JSON.stringify(call.args)) : {},
        suggestedQuestions,
        pagination: paginationMeta,
        tableData: finalTableData,
        fields: finalFields,
        tableTitle: finalTableTitle,
        schema: schema,
      },
    });

    if (toolResult.page !== undefined) {
      context.lastPage = toolResult.page;
    }

    contextCache.set(contextKey, {
      ...context,
      lastQuery: query,
      lastResults: toolResult,
      lastTool: call.name,
      activeEntity:
        call.name === "get_details" && call.args
          ? {
            type: call.args.type,
            identifier: call.args.identifier,
            data: toolResult,
          }
          : context.activeEntity,
      conversationCount: (context.conversationCount || 0) + 1,
    });

    const completePayload = {
      success: true,
      conversationId,
      reply: replyText,
      responseType,
      data: finalTableData,
      fields: finalFields,
      tableTitle: finalTableTitle,
      suggestedQuestions,
      toolName: call.name,
      toolArgs: call.args ? JSON.parse(JSON.stringify(call.args)) : {},
      schema: schema,
    };

    if (paginationMeta) {
      completePayload.metadata = paginationMeta;
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
    });
    res.end();
  }
};

// ============ GET CHAT PAGE (Pagination) ============

export const getChatPage = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const role = req.user.role;
    const { conversationId, messageLogId, page, toolName, toolArgs } = req.body;

    if (!toolName) {
      return res.status(400).json({
        success: false,
        message: "toolName is required",
      });
    }

    if (!page || page < 1) {
      return res.status(400).json({
        success: false,
        message: "A valid page number is required",
      });
    }

    let resolvedArgs =
      toolArgs && typeof toolArgs === "object" ? toolArgs : null;

    if (!resolvedArgs && messageLogId) {
      try {
        const log = await chatLogModel
          .findById(messageLogId)
          .select("metadata")
          .lean();
        if (
          log?.metadata?.toolArgs &&
          typeof log.metadata.toolArgs === "object"
        ) {
          resolvedArgs = log.metadata.toolArgs;
        }
      } catch {
        // Non-fatal: fall through to default
      }
    }

    if (!resolvedArgs) {
      resolvedArgs = {};
    }

    const args = { ...resolvedArgs, page: Number(page) };

    const toolResult = await executeTool(toolName, args, organizationId, role);

    if (toolResult.error) {
      return res.status(500).json({
        success: false,
        message: toolResult.message || "Failed to fetch page",
      });
    }

    const extractedData = extractData(toolResult);
    let tableData = null;
    let fields = null;
    let tableTitle = "Results";

    if (extractedData) {
      if (extractedData.data && extractedData.fields) {
        tableData = extractedData.data;
        fields = extractedData.fields;
        tableTitle = extractedData.tableTitle || "Results";
      } else {
        tableData = extractedData;
      }
    }

    if (toolResult.data && toolResult.fields) {
      tableData = toolResult.data;
      fields = toolResult.fields;
      tableTitle = toolResult.tableTitle || "Results";
    }

    const pagination =
      toolResult.page !== undefined
        ? {
          page: toolResult.page,
          totalPages: toolResult.totalPages,
          count: toolResult.count,
          pageSize: toolResult.pageSize || CONSTANTS.DEFAULT_PAGE_LIMIT,
          showingRange: toolResult.showingRange,
        }
        : null;

    return res.json({
      success: true,
      data: tableData,
      fields: fields,
      tableTitle: tableTitle,
      pagination,
    });
  } catch (error) {
    console.error("Error in getChatPage:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching page",
    });
  }
};

// ============ GET CHAT HISTORY ============

export const getChatHistory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const role = req.user.role;
    const {
      conversationId,
      limit = 50,
      intent,
      startDate,
      endDate,
      targetOrganizationId,
    } = req.query;

    const filter = { userId };

    if (role === "super_admin" && targetOrganizationId) {
      filter.organizationId = targetOrganizationId;
    } else if (organizationId) {
      filter.organizationId = organizationId;
    } else if (role === "super_admin") {
      // Super Admin without target org - show all
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

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
      message: "Internal server error",
    });
  }
};

// ============ CLEAR CONTEXT ============

export const clearContext = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const conversationId =
      req.body?.conversationId || req.query?.conversationId;

    if (conversationId) {
      const contextKey = getContextKey(organizationId, userId, conversationId);
      contextCache.delete(contextKey);
    } else {
      const prefix = `${organizationId || "super_admin"}_${userId}_`;
      contextCache.clearByPrefix(prefix);
    }

    res.status(200).json({
      success: true,
      message: "Conversation context cleared",
    });
  } catch (error) {
    console.error("Error in clearContext:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
