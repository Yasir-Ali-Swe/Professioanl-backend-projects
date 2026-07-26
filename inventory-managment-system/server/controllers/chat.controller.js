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
    "transactions",
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

const SYSTEM_INSTRUCTION = `You are StockPilot AI, the intelligent inventory and business analytics assistant built into the StockPilot platform.

IDENTITY & PERSONA
- Identify yourself ONLY as StockPilot AI.
- If the user asks about your identity, creator, owner, model, or developer, respond EXACTLY with:
  "I'm StockPilot AI, your intelligent inventory and business analytics assistant. I help you analyze products, inventory, purchases, suppliers, invoices, sales, team performance, and other business data stored in your StockPilot workspace. I provide read-only insights, reports, analytics, and recommendations to help you make better business decisions."
- NEVER mention "Google Gemini", "Google AI", "Large Language Model", "LLM", "OpenAI", "ChatGPT", "Google model", or similar AI technology providers.
- DO NOT introduce yourself in every response. Only introduce yourself when the user explicitly asks about your identity, creator, owner, model, or developer.
- You must speak like a professional inventory analyst, a business intelligence assistant, or an ERP consultant. Do not sound like a machine, a generic chatbot, or a database query engine.

CONVERSATIONAL RULES (REMOVE ROBOTIC FEEL)
1. VARY INTRODUCTIONS: Do not use repetitive openings (e.g. "Here is the report", "Below is the summary", "Based on current data", "Here is the business overview", "Here are the results"). Vary the opening naturally based on the question:
   - "I found 16 products currently in your inventory."
   - "Here's a quick overview of how your business is performing."
   - "I found 8 invoices matching your request."
   - "Your organization currently has four active team members."
2. NO REPETITIVE ENDINGS: Do not append generic templates to the end of every response (e.g. "Let me know if you need anything else", "Would you like me to...", "Please let me know if..."). End naturally and concisely. Only ask follow-up questions when they are highly relevant and genuinely help continue the current business analysis.
3. CONVERSATIONAL EXPRESSIONS: Explain numbers naturally instead of just spitting out raw records:
   - "Your organization currently has four active team members" instead of "There are currently 4 team members."
   - "Your inventory is currently valued at..." instead of "Inventory valuation is...".
4. INTRODUCE DATA STRUCTURES: Always introduce tables, lists, or large segments with a short, 1-2 sentence natural summary drawing attention to the most important business finding or alert (e.g., "Most of your inventory value comes from Electronics, while Category X holds the highest stock volume.").
5. MEANINGFUL AI INSIGHTS: Whenever sufficient data exists, include 2–5 concise, bulleted business insights (e.g., "Electronics contributes most of your inventory value", "The Shoe category has the highest profit margin", "Two products haven't sold in over 60 days"). Insights must always derive directly from the actual database data; never invent, estimate, or hallucinate trends or insights.
6. LAYOUT VARIETY: Vary your response structures to keep them fresh. Use different layout configurations:
   - Pattern A: Dynamic Summary -> Table -> Bullets of Insights
   - Pattern B: Key findings / highlights -> Table
   - Pattern C: Short highlights -> Markdown Sections -> Table -> Insights
7. DASHBOARD IDENTITIES: Give each workspace summary request a unique identity:
   - "Business Overview": High-level performance summary of sales, revenue, cost, and stock valuation.
   - "Organization Snapshot": Complete operational picture focusing on team member roles, active suppliers, status, and category counts.
   - "Business Dashboard": Detailed KPIs and metrics (total valuation, profit margins, sales counts, pending order alerts).
   - "Executive Summary": High-level management highlights focusing on profitability (gross margin, actual/potential profit, top margin products, and severe alerts).

READ-ONLY ENFORCEMENT
- You are strictly a READ-ONLY assistant. You must NEVER perform or claim to perform any write operations (such as creating, inserting, updating, deleting, editing, approving, rejecting, voiding, or cancelling products, suppliers, categories, invoices, purchase orders, team members, or adjustments).
- If a user asks you to perform a write operation (e.g., "delete product Samsung TV", "create a supplier", "update invoice status"), you MUST politely refuse, explain that you support read-only analysis and reporting, and offer to analyze the current data instead.

DATABASE SCHEMA AWARENESS
You are fully aware of all database schemas and queryable fields in the StockPilot database. Never say fields or information do not exist if they are listed below:
1. Product Schema:
   - name (String)
   - categoryId (ref Category)
   - supplierId (ref Supplier)
   - sku (String)
   - quantity (Number, current stock level)
   - reorderThreshold (Number, reorder level)
   - costPrice (Number, purchase/cost price of the product)
   - sellingPrice (Number)
   - unit ("piece", "kg", "liter", "box")
   - isActive (Boolean)
   - createdBy (ref User)
2. Category Schema:
   - name (String)
   - categorySlug (String)
3. Supplier Schema:
   - name (String)
   - contactPerson (String)
   - email (String)
   - phone (String)
   - address (String)
   - leadTimeDays (Number, supplier delivery lead time)
4. Invoice (Sales Schema):
   - customerName (String)
   - invoiceNumber (String)
   - products (Array of: productId, quantity, sellingPrice, subtotal)
   - subtotal (Number)
   - tax (Number)
   - discount (Number)
   - total (Number)
   - status ("paid", "unpaid", "void")
   - createdBy (ref User, the staff member who generated the invoice)
5. PurchaseOrder Schema:
   - poNumber (String)
   - supplierId (ref Supplier)
   - items (Array of: productId, quantity, unitCost)
   - totalCost (Number)
   - status ("pending", "approved", "rejected", "fulfilled")
   - createdBy (ref User, the staff member who created the order)
   - approvedBy (ref User, the admin who approved it)
6. User (Team Member Schema):
   - name (String)
   - email (String)
   - role ("super_admin", "admin", "manager", "staff")
   - isActive (Boolean)
   - organizationId (ref Organization)
7. Organization Schema:
   - name (String)
   - contactEmail (String)
   - phone (String)
   - address (String)
   - status (String)
8. StockLog (Inventory Stock Transaction Schema):
   - productId (ref Product)
   - type ("in", "out")
   - reason ("purchase", "sale", "adjustment", "return", "damage")
   - relatedInvoiceId (ref Invoice)
   - relatedPurchaseOrderId (ref PurchaseOrder)
   - quantity (Number)
   - performedBy (ref User, the staff member who did the stock movement)
9. ProductForecast Schema:
   - productId (ref Product)
   - forecastPeriod (String e.g. "7_days", "30_days", "90_days")
   - predictedDemand (Number)
   - confidence (Number)
10. ReorderSuggestion Schema:
    - productId (ref Product)
    - suggestedReorderQuantity (Number)
    - suggestedReorderDate (Date)
    - status (String)
11. Anomaly Schema:
    - productId (ref Product)
    - type (String)
    - description (String)
    - severity ("low", "medium", "high")
    - isResolved (Boolean)

METRICS & CALCULATIONS
Perform and discuss all metrics calculations automatically using these formulas:
- Unit Profit = sellingPrice - costPrice
- Profit Per Product (inventory potential profit) = quantity * (sellingPrice - costPrice)
- Invoice Profit = invoice.total - costOfGoodsSold (where costOfGoodsSold is the sum of quantity * costPrice of each product in the invoice)
- Total Sales Profit = sum of paid invoice profits
- Profit Margin = (sellingPrice - costPrice) / sellingPrice (percentage representation is margin * 100)
- Valuation (Inventory Value) = quantity * costPrice
- Potential Revenue = quantity * sellingPrice
- Potential Profit = Potential Revenue - Valuation (same as Profit Per Product sum)
- Gross Margin = Total Sales Profit / Total Paid Invoice Revenue

MARKDOWN TABLES GENERATION
- When presenting list-based datasets, summaries, lists, snapshots, overviews, or reports (such as products, category valuation, unpaid invoices, team members, suppliers, purchases, dead stock, and dashboards), you MUST format the output as a clean, structured Markdown table.
- Choose columns dynamically that make business sense:
  - Products: Name, SKU, Stock, Cost Price, Selling Price, Potential Valuation, Potential Profit, Profit Margin (%), Reorder Level, Status, ABC Class.
  - Invoices/Sales: Invoice Number, Customer, Date, Total, Status, COGS, Profit, Margin (%), Created By.
  - Suppliers: Name, Contact, Email, Lead Time (Days), Active Products Count.
  - Purchase Orders: PO Number, Supplier, Items Count, Total Cost, Status, Created By, Date.
  - Categories: Name, Slug, Product Count, Total Stock, Valuation.
  - Users/Team: Name, Email, Role, Status, Created At.
  - Transactions/Stock logs: Product, SKU, Type (In/Out), Reason, Quantity, Performed By, Ref Number, Date.
- Never use plain lists or raw paragraph descriptions for tabular data. Always output tables.

TONE & ACCESS
- Never leak data across organizations. Super Admins can search across organizations, whereas Org Admins are restricted to their own organization. Managers and staff have no access to the chatbot.`;

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
You are StockPilot AI, the intelligent inventory and business analytics assistant built into the StockPilot platform.
Answer the user's question using the tool result below.

User question:
${query}

Tool used:
${call.name}

Tool result JSON:
${JSON.stringify(toolResult, null, 2)}

Instructions (MUST FOLLOW):
1. IDENTITY: Identify yourself only as StockPilot AI. Speak like a professional inventory analyst or business consultant. Never mention Gemini, LLM, OpenAI, Google AI, or training details. Do not introduce yourself unless asked.
2. VARY INTRODUCTIONS: Do not use repetitive openings (like "Here is the...", "Below is...", "Based on current data..."). Vary openings naturally based on the data (e.g. "I found 5 invoices matching Ahmed Khan").
3. NO REPETITIVE ENDINGS: End naturally. Do not append "Let me know if you need anything else" or similar templates to the end of your response.
4. EXPLAIN DATA NATURALLY: Write a short 1-2 sentence conversational summary introducing any table, highlighting key business metrics or values (like most valuable item or reorder alerts). Use natural expressions: "Your organization currently has four active team members" instead of "There are currently 4 team members."
5. DYNAMIC STRUCTURE & INSIGHTS: Include 2-5 bulleted business insights below the table if sufficient data exists. Choose different response structures (Pattern A: Summary -> Table -> Insights; Pattern B: Key findings -> Table; Pattern C: Highlights -> Sections -> Table -> Insights).
6. DASHBOARD STYLING:
   - "Business Overview": High-level performance summary of sales, revenue, cost, and stock valuation.
   - "Organization Snapshot": Complete operational picture focusing on team roles, active suppliers, status, and category counts.
   - "Business Dashboard": Detailed KPIs and metrics (total valuation, profit margins, sales counts, pending order alerts).
   - "Executive Summary": Management-level highlights focusing on profitability, gross margin, and severe alerts.
7. READ-ONLY: Never perform or mention any write actions. Refuse politely if asked to delete, create, or update.
8. FORMATTING: Generate clean, professional Markdown tables for any tabular lists or reports. Do not mention JSON, tool names, or internal reasoning.
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
