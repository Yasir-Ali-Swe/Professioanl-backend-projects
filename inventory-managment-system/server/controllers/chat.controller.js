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
  if (toolResult.invoice?.lineItems) return toolResult.invoice.lineItems;
  if (toolResult.purchaseOrder?.lineItems) return toolResult.purchaseOrder.lineItems;
  if (toolResult.supplier?.productsList) return toolResult.supplier.productsList;
  if (toolResult.category?.productsList) return toolResult.category.productsList;
  if (toolResult.summary?.customerProductsPurchased) return toolResult.summary.customerProductsPurchased;

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
    lowerQuery.includes("it") ||
    lowerQuery.includes("this") ||
    lowerQuery.includes("its") ||
    lowerQuery.includes("who") ||
    lowerQuery.includes("product") ||
    lowerQuery.includes("supplier") ||
    lowerQuery.includes("customer") ||
    lowerQuery.includes("stock") ||
    lowerQuery.includes("category") ||
    lowerQuery.includes("creator");

  if (context.activeEntity && (isFollowUpWord || isEntityPronoun)) {
    const activeInfo = JSON.stringify({
      type: context.activeEntity.type,
      identifier: context.activeEntity.identifier,
      summary: context.activeEntity.data?.invoice?.general ||
        context.activeEntity.data?.purchaseOrder?.general ||
        context.activeEntity.data?.supplier?.info ||
        context.activeEntity.data?.product?.general || {},
    });
    enhancedQuery = `${query} (Active context entity: ${activeInfo})`;
  } else if (context.lastResults && context.lastTool && isFollowUpWord) {
    const contextSnippet = buildFollowUpContext(
      context.lastResults,
      context.lastTool,
    );
    enhancedQuery = `${query} (Based on previous tool ${context.lastTool} results: ${contextSnippet})`;
  }

  return enhancedQuery;
};

const extractSuggestedQuestions = (reply, userQuery = "") => {
  if (!reply) return [];

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

IDENTITY:
- Identify as "StockPilot AI" only when asked about your identity.
- Never mention Google, Gemini, LLM, or AI providers.
- If asked about topics outside inventory management, politely decline and redirect.

ROLE-BASED ACCESS:
- Admin: Can only access their organization's data
- Super Admin: Can access all organizations
- Both roles have READ-ONLY permissions. Politely refuse write requests.

DATA SOURCE:
- Answer ONLY using tool result data.
- Never invent, estimate, or add numbers not present.
- If data is missing, state it plainly.

RESPONSE STRUCTURE (MUST FOLLOW THIS EXACT ORDER WITH THESE HEADERS):
## 📦 SUMMARY
(Quick overview with key metrics formatted as markdown bullet list)

## 📊 PRIMARY CONTENT
| Column | ... |
(Include a Markdown table representing the data when available)

## 💡 AI INSIGHTS
(Meaningful observations from the data as 2-4 markdown bullet points)

## 🎯 RECOMMENDATIONS
(Actions based on insights as 2-4 markdown bullet points)

💬 SUGGESTED QUESTIONS:
(3-4 high-value follow-up questions as markdown bullet points)

CRITICAL FORMATTING RULES:
- Format headers with markdown '## ' (e.g., ## 📦 SUMMARY, ## 📊 PRIMARY CONTENT, ## 💡 AI INSIGHTS, ## 🎯 RECOMMENDATIONS)
- Format currency as PKR 1,234,567.00
- Format percentages as 43%

CRITICAL BULLET POINT FORMATTING RULES:
- Each bullet point MUST start with "- " (dash followed by space) on a NEW LINE
- Each bullet point MUST be on its OWN SEPARATE LINE
- DO NOT use Unicode bullet symbols (like •)
- Use standard Markdown bullet syntax: - 

SUGGESTED QUESTIONS RULES:
- Include 💬 SUGGESTED QUESTIONS ONLY if there are genuine, high-value follow-up questions that naturally extend the conversation.
- NEVER repeat, restate, or slightly rephrase the user's current question.
- Omit 💬 SUGGESTED QUESTIONS completely for greetings, thank-you messages, capability/identity questions, error responses, or simple answers without a logical next step.

TONE: Write like a knowledgeable colleague. Short, direct sentences. Flag notable, risky, or surprising data.

HARD STOP: Stop after completing response. No wrap-up or restatement.`;

const trimToolResult = (result) => {
  if (!result || typeof result !== "object") return result;
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
    const lowerQuery = (query || "").toLowerCase();
    const isDetailed =
      lowerQuery.includes("detail") ||
      lowerQuery.includes("complete") ||
      lowerQuery.includes("all field") ||
      lowerQuery.includes("every field") ||
      lowerQuery.includes("full info") ||
      lowerQuery.includes("margin") ||
      lowerQuery.includes("cost price") ||
      lowerQuery.includes("profit") ||
      lowerQuery.includes("valuation") ||
      lowerQuery.includes("supplier") ||
      lowerQuery.includes("category");

    return isDetailed ? "products_detailed" : "products_compact";
  }

  if (toolName === "query_purchases") return "purchases";
  if (toolName === "query_transactions") return "transactions";
  if (toolName === "query_organization") {
    const sample = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (sample && sample.contactEmail !== undefined) {
      return "organizations";
    }
    return "users";
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
| Result Count | Total Value |
| --- | --- |
| ${count} | PKR ${formatCurrency(summary.totalValue || 0)} |

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

export const chatWithAI = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;
    const role = req.user.role;
    const { query } = req.body;

    const conversationId = getConversationId(req);

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

    const data = extractData(toolResult);

    const response = {
      success: true,
      conversationId,
      reply: replyText,
      type: responseType,
      data,
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

export const chatWithAIStream = async (req, res) => {
  const organizationId = req.organizationId;
  const userId = req.user._id;
  const role = req.user.role;
  const { query } = req.body;
  const conversationId = getConversationId(req);

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

    const toolResult = await executeTool(
      call.name,
      call.args,
      organizationId,
      role,
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

    const data = extractData(toolResult);
    const schema = detectSchema(query, call.name, data);

    sendStreamEvent(res, {
      type: "tool",
      success: true,
      name: call.name,
      data: data,
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
        lower.includes("customer") ||
        toolResult.summary?.customerProductsPurchased
      ) {
        return "CUSTOMER_PROFILE";
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

      // Check if result is empty
      const isEmpty = trimmedResult?.summary?.isEmpty === true;
      const emptyMessage = trimmedResult?.summary?.message || "No data found matching your criteria.";

      let instructions = "";

      if (isEmpty) {
        instructions = `
INTENT: The user's query returned no results.

RULES:
1. Respond with a clear, polite message that no data was found.
2. DO NOT show tables, summaries with zeros, or N/A rows.
3. Provide helpful suggestions for what the user could try instead.

REQUIRED LAYOUT:
## 📦 SUMMARY
- No results found for your query.

## 💡 AI INSIGHTS
- ${emptyMessage}

## 💬 SUGGESTED QUESTIONS:
- Try rephrasing your query with different keywords
- Ask to see all available items in a category
- Check if you have the correct spelling for names or IDs
- Try a broader search without specific filters
`;
        return `You are StockPilot AI, an Inventory Analyst. Answer using ONLY the tool result data below. Never invent or estimate numbers.

User question: ${query}

Tool result JSON:
${dataJson}

${instructions}

CRITICAL FORMATTING RULES:
- Headers MUST start with '## ' (e.g. ## 📦 SUMMARY, ## 💡 AI INSIGHTS, ## 💬 SUGGESTED QUESTIONS)
- Format currency as PKR 1,234,567.00
- Format percentages as 43%
- Each bullet point MUST start with "- " on its OWN SEPARATE LINE.
- DO NOT use Unicode bullet symbols (like •).
- Write like a knowledgeable colleague. Short, direct sentences.
- Keep the tone helpful and encouraging.`;
      }

      if (intent === "LINE_ITEMS") {
        instructions = `
INTENT: The user wants to see specific line items or products within an invoice or purchase order.

RULES:
1. Answer the user's specific request FIRST. Provide a clean summary overview.
2. Present the line items directly under "## 📊 INVOICE ITEMS" or "## 📊 PURCHASE ORDER ITEMS" as a Markdown table.
3. DO NOT include "## 💡 AI INSIGHTS" or "## 🎯 RECOMMENDATIONS" because recommendations are NOT relevant for simple line item requests.
4. End with "💬 SUGGESTED QUESTIONS:" containing 2-3 logical follow-up questions.

REQUIRED LAYOUT:
## 📦 SUMMARY
- Total Items: X
- Total Invoice/PO Amount: PKR ...

## 📊 INVOICE ITEMS
| Product Name | SKU | Quantity | Unit Price | Subtotal | Profit | Margin |
| --- | --- | --- | --- | --- | --- | --- |

💬 SUGGESTED QUESTIONS:
- Who created this invoice?
- Show customer details
`;
      } else if (intent === "ENTITY_DETAILS") {
        instructions = `
INTENT: The user wants to view comprehensive details/profile for an entity (Invoice, PO, Supplier, Category, User, or Org).

RULES:
1. Present general information metrics under "## ℹ️ GENERAL INFORMATION".
2. Present line items or catalog breakdown under "## 📊 PRIMARY CONTENT" as a Markdown table.
3. DO NOT generate "## 🎯 RECOMMENDATIONS" unless there is an explicit critical alert or risk.
4. End with "💬 SUGGESTED QUESTIONS:" containing 2-3 relevant follow-ups.

REQUIRED LAYOUT:
## ℹ️ GENERAL INFORMATION
- (Entity attributes as bullet points)

## 📊 PRIMARY CONTENT
| Product/Item Name | SKU | Quantity | ... |

💬 SUGGESTED QUESTIONS:
- (Follow-up 1)
- (Follow-up 2)
`;
      } else if (intent === "CUSTOMER_PROFILE") {
        instructions = `
INTENT: The user requested customer spending info or purchased items.

RULES:
1. Present customer spend metrics FIRST under "## 👤 CUSTOMER PROFILE".
2. Present purchased products or invoice history under "## 📊 PURCHASED PRODUCTS" as a Markdown table.
3. DO NOT generate generic recommendations.
4. End with "💬 SUGGESTED QUESTIONS:".

REQUIRED LAYOUT:
## 👤 CUSTOMER PROFILE
- Customer Name: ...
- Total Spent: PKR ...

## 📊 PURCHASED PRODUCTS
| Product Name | SKU | Quantity Purchased | Total Spent |

💬 SUGGESTED QUESTIONS:
- (Follow-up 1)
- (Follow-up 2)
`;
      } else if (intent === "LISTING_COMPACT") {
        instructions = `
INTENT: The user requested a product list or entity listing overview.

RULES:
1. Provide quick metric summary under "## 📦 SUMMARY".
2. Present a clean Markdown table of the primary fields under "## 📊 PRIMARY CONTENT".
3. Provide 2-3 brief insights under "## 💡 AI INSIGHTS" if relevant. Omit recommendations unless low/dead stock is detected.
4. End with "💬 SUGGESTED QUESTIONS:".

REQUIRED LAYOUT:
## 📦 SUMMARY
- (3-5 summary metrics as bullet points)

## 📊 PRIMARY CONTENT
| Name/Number | SKU | Quantity | Selling Price | Status |

## 💡 AI INSIGHTS
- (1-3 key insights)

💬 SUGGESTED QUESTIONS:
- (Follow-up 1)
`;
      } else {
        instructions = `
INTENT: Strategic analytical inquiry (Dead stock, stockout risk, forecasts, anomalies).

RULES:
1. Provide a comprehensive summary under "## 📦 SUMMARY".
2. Present data table under "## 📊 PRIMARY CONTENT".
3. Provide 2-4 actionable insights under "## 💡 AI INSIGHTS".
4. Provide 2-4 strategic actions under "## 🎯 RECOMMENDATIONS".
5. End with "💬 SUGGESTED QUESTIONS:".

REQUIRED LAYOUT:
## 📦 SUMMARY
- (Key metrics)

## 📊 PRIMARY CONTENT
| Product Name | SKU | Quantity | ... |

## 💡 AI INSIGHTS
- (Key observations)

## 🎯 RECOMMENDATIONS
- (Actionable steps)

💬 SUGGESTED QUESTIONS:
- (Follow-up 1)
`;
      }

      return `You are StockPilot AI, an Inventory Analyst. Answer using ONLY the tool result data below. Never invent or estimate numbers.

User question: ${query}

Tool result JSON:
${dataJson}

${instructions}

CRITICAL FORMATTING RULES:
- Headers MUST start with '## ' (e.g. ## 📦 SUMMARY, ## 📊 INVOICE ITEMS, ## ℹ️ GENERAL INFORMATION, ## 💡 AI INSIGHTS, ## 🎯 RECOMMENDATIONS)
- Format currency as PKR 1,234,567.00
- Format percentages as 43%
- Each bullet point MUST start with "- " on its OWN SEPARATE LINE.
- DO NOT use Unicode bullet symbols (like •).
- Write like a knowledgeable colleague. Short, direct sentences.
`;
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
        }
        : null;

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
        tableData: data,
        schema: schema,
      },
    });
    console.log(data)
    console.log(toolResult)
    console.log(replyText)

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
      data,
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

    const data = extractData(toolResult);

    const pagination =
      toolResult.page !== undefined
        ? {
          page: toolResult.page,
          totalPages: toolResult.totalPages,
          count: toolResult.count,
        }
        : null;

    return res.json({
      success: true,
      data,
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
