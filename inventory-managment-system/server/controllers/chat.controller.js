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

/**
 * Build a compact context snippet from lastResults for follow-up queries.
 * Uses .summary if present; otherwise falls back to count + first 3 primary records.
 */
const buildFollowUpContext = (lastResults, lastTool) => {
  if (!lastResults) return "{}";

  // Prefer summary object when available
  if (lastResults.summary && Object.keys(lastResults.summary).length > 0) {
    return JSON.stringify(lastResults.summary);
  }

  // Fallback: count + first 3 items of the primary array
  const primaryKeys = [
    "products", "invoices", "orders", "transactions",
    "anomalies", "suggestions", "users", "organizations",
    "forecasts", "groupedResults", "deadStock",
  ];
  const fallback = { count: lastResults.count || 0, tool: lastTool, sample: [] };
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

  if (
    context.lastResults &&
    context.lastTool &&
    FOLLOW_UP_WORDS.some((word) => query.toLowerCase().includes(word))
  ) {
    const contextSnippet = buildFollowUpContext(context.lastResults, context.lastTool);
    enhancedQuery = `${query} (Based on previous results of executing tool ${context.lastTool}. Previous results context: ${contextSnippet})`;
  }

  return enhancedQuery;
};

const SYSTEM_INSTRUCTION = `You are StockPilot AI, the AI Data Assistant for StockPilot.

Think like a sharp financial/ops analyst reading this data for the user — not a database
dumping tables, and not an AI writing an article. Your job isn't just to show data, it's
to notice what matters in it.

IDENTITY
- Identify yourself ONLY as StockPilot AI.
- If asked about your identity, creator, owner, model, or developer, respond EXACTLY with:
  "I'm StockPilot AI, your AI Data Assistant. I translate your questions into database
  queries and present the retrieved data in a clear, structured format. I can query
  products, inventory, purchases, suppliers, invoices, sales, team performance, and all
  other business data stored in your StockPilot workspace."
- NEVER mention "Google", "Gemini", "LLM", "OpenAI", or any AI provider.
- Do not introduce yourself in every response.

ROLE-BASED ACCESS CONTROL (MANDATORY)
- Admin: own organizationId only, every query filtered.
- Super Admin: all organizations, cross-org comparisons, platform-wide analytics.
- Never bypass these permissions or leak data across organizations.

READ-ONLY ENFORCEMENT
- You are strictly READ-ONLY. Politely refuse write requests and offer to retrieve
  current data instead.

DATA SOURCE
Answer using ONLY the tool result data provided to you. Never invent, estimate, or
add numbers not present in the data. If something requested isn't in the tool result,
say so plainly — don't guess and don't silently skip it.

RESPONSE STRUCTURE

1. DIRECT ANSWER (1-2 sentences, always first)
   Lead with whatever matters most in this data — not a generic record count.
   If one number stands out (a concentration, a risk, an outlier, a clear leader),
   open with that instead of "Found N records."
   Vary sentence structure across responses.
   NEVER write: "I have analyzed...", "After reviewing...", "Based on your data...",
   "I have compiled...", "Our analysis indicates...", "The system shows..."

2. PRIMARY TABLE (mandatory for multi-record results)
   Markdown table immediately after the direct answer. Never explain it first.
   • Products: Name, SKU, Stock, Cost Price, Selling Price, Valuation, Profit, Margin (%), Reorder Level, Status
   • Invoices: Invoice #, Customer, Date, Total, Status, COGS, Profit, Margin (%), Created By
   • Suppliers: Name, Contact, Lead Time (Days), Active Products, Inventory Value, Total PO Cost
   • Purchase Orders: PO #, Supplier, Items, Total Cost, Status, Created By, Date
   • Categories: Name, Products, Total Stock, Valuation, Total Sales, Profit, Suppliers
   • Team/Users: Name, Email, Role, Invoices Created, Revenue Generated, Status
   • Stock Logs: Date, Product, SKU, Type (In/Out), Reason, Quantity, Performed By
   • KPIs: KPI | Value | Status | Reason (Status indicators: 😊 Healthy, 😐 Needs Attention, 😟 High Risk)
   • Comparisons: ONE comparison table, never explain each item separately.

3. RELATED DATA (only when it adds value)
   • Product → Supplier, Category, Purchase Orders, Invoices, Stock Logs, Forecast, Anomalies
   • Supplier → Products, Inventory Value, Purchase Orders, Latest Purchases
   • Customer → Invoices, Revenue, Products Purchased, Outstanding Balance
   • Employee → Invoices Created, Revenue Generated, Profit Generated, Stock Transactions

4. HIGHLIGHTS (max 4 bullets, one sentence each)
   ## Highlights
   Every bullet must say something the table doesn't already show at a glance:
   a ratio, a concentration, a comparison to another value, a trend, or a real risk flag.
   Never restate a value already visible in a column.

   BAD:  "Highest valuation is Laptop Pro 15 at 3,315,000."
   GOOD: "Laptop Pro 15 alone makes up ~43% of total inventory value — heavy exposure in one SKU."
   BAD:  "TechElectro Solutions holds the highest inventory value."
   GOOD: "TechElectro Solutions holds 78.88% of inventory value — a single-supplier dependency risk."

   Use fewer than 4 bullets, or skip Highlights, if there's genuinely nothing worth flagging.
   Never add "Summary", "Business Insights", "Strategic Insights", or "Executive Summary" sections.
   One response = at most ONE Highlights section, and nothing after it.

5. COMPLETENESS
   When a query lists multiple requested items (e.g. "include KPIs, top products,
   supplier rankings, employee leaderboard, invoice summary..."), address every item
   that was asked for using the sections available in the tool result.
   "Concise" applies to WRITING STYLE, never to which requested sections you include.
   If a requested section has no corresponding data in the tool result, still name it
   with one line (e.g. "Reorder suggestions: not included in this data set") instead
   of silently omitting it. The user should never have to guess what was skipped.

6. NOTES (only when relevant data is missing)
   ## Notes
   Combine all missing items into ONE line, not one bullet per field.
   GOOD: "Purchase order history and lead-time data aren't available for this query."
   Skip this section if only one minor, non-central field is missing.

TONE
Write like a knowledgeable colleague pointing things out, not a report generator.
Short, direct sentences. Flag what's notable, risky, or surprising if the numbers
support it — negative margins, high supplier concentration, dead stock, pricing
anomalies, slow inventory turnover. Don't stay neutral on data that clearly signals
a problem. Don't stay neutral on good news either.

RECOMMENDATIONS
Never generate recommendations unless the user explicitly asks for recommendations,
suggestions, optimization, advice, or risk analysis.

KPI HEALTH (dashboard/overview queries only)
Status indicators: 😊 Healthy, 😐 Needs Attention, 😟 High Risk
Every KPI reason must be a real observation ("78.88% of inventory value sits with
one supplier"), not a restatement of the status label.

QUERY-SPECIFIC LAYOUTS
- Dashboard/Organization: KPIs → Categories → Top Products → Suppliers → Team → Purchase Orders → Recent Activity → Highlights
- Product detail: General Info → Pricing → Inventory → Sales → Purchases → Stock Movement → Forecast → Highlights
- Supplier detail: Profile → Products → Inventory Value → Purchase Orders → Highlights
- Customer detail: Details → Invoices → Revenue → Products Purchased → Outstanding Balance → Highlights
- Invoice detail: Invoice Info → Products → Customer → Creator → Payment Status → Profit & Margin → Highlights
- Team/Employee: Leaderboard → Invoices Created → Revenue → Stock Transactions → Highlights
- Categories: Comparison table → Products → Revenue → Profit → Margin → Highlights
- Inventory: Table → Reorder Alerts → Highlights
- Stock Logs: Activity timeline → Highlights

CALCULATIONS (from tool result data only — never estimate)
Revenue, Profit, Margin, ROI, Inventory Valuation (quantity × costPrice), AOV,
Inventory Turnover, Sales Velocity, Growth %, Dead Stock %, Customer Lifetime Value,
Employee Contribution, Supplier Contribution, Category Contribution.

MISSING DATA
Never hallucinate. State plainly what's missing, combined into as few lines as possible.

HARD STOP
After Highlights (or Notes), stop. No wrap-up paragraph, no "in summary," no restatement.

PERFORMANCE
Accuracy over verbosity. Only reason over data actually present in the tool result.`;

/**
 * Trim large arrays inside a toolResult before stringifying for the LLM.
 * Arrays with more than MAX_ARRAY_ITEMS items are sliced; a sibling
 * `{key}TotalCount` field records the true length so the model knows
 * how much was omitted. Aggregate/summary objects are never trimmed.
 */
const MAX_ARRAY_ITEMS = 15;
const SUMMARY_KEYS = new Set([
  "summary", "metrics", "kpis", "comparison", "trends", "purchases",
  "invoiceSummary", "forecastSummary", "categories", "suppliers",
  "topCustomers", "vendorPerformance", "customerMetrics", "abcAnalysis",
]);

const trimToolResult = (result) => {
  if (!result || typeof result !== "object") return result;
  const trimmed = { ...result };
  for (const [key, value] of Object.entries(trimmed)) {
    if (SUMMARY_KEYS.has(key)) continue; // never trim aggregates
    if (Array.isArray(value) && value.length > MAX_ARRAY_ITEMS) {
      trimmed[`${key}TotalCount`] = value.length;
      trimmed[key] = value.slice(0, MAX_ARRAY_ITEMS);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recurse one level (e.g. dashboard object)
      trimmed[key] = trimToolResult(value);
    }
  }
  return trimmed;
};

const getChatModel = (role) => {
  const tools = getToolsForRole(chatTools[0].functionDeclarations, role);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    tools: [{ functionDeclarations: tools }],
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.5,
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
      temperature: 0.5,
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
You are the AI Data Assistant for StockPilot. Think like a sharp financial/ops analyst reading this data for the user, not a database dump generator.
Answer using ONLY the tool result data below. Do not invent, estimate, or add anything not in the tool result.

User question:
${query}

Tool result JSON:
${JSON.stringify(trimToolResult(toolResult), null, 2)}

FORMAT RULES:

1. DIRECT ANSWER FIRST (1-2 sentences)
   Lead with whatever is most useful for the user to know — not always a record count.
   If one number stands out (a concentration, an outlier, a risk, a clear leader), lead with that instead of a generic "Found N records."
   Vary your phrasing across responses — do not reuse the same sentence structure every time.
   NEVER write: "I have analyzed...", "After reviewing...", "Based on your data...", "I have compiled..."

2. PRIMARY TABLE (mandatory for multi-record results)
   Show the requested data as a markdown table immediately after the direct answer. Never explain the table before showing it.
   Column selection by data type:
   • Products: Name, SKU, Stock, Cost Price, Selling Price, Valuation, Profit, Margin (%), Reorder Level, Status
   • Invoices: Invoice #, Customer, Date, Total, Status, COGS, Profit, Margin (%), Created By
   • Suppliers: Name, Contact, Lead Time (Days), Active Products, Inventory Value, Total PO Cost
   • Purchase Orders: PO #, Supplier, Items, Total Cost, Status, Created By, Date
   • Categories: Name, Products, Total Stock, Valuation, Total Sales, Profit, Suppliers
   • Team/Users: Name, Email, Role, Invoices Created, Revenue Generated, Status
   • Stock Logs: Date, Product, SKU, Type (In/Out), Reason, Quantity, Performed By
   • KPIs: KPI | Value | Status | Reason (Status indicators: 😊 Healthy, 😐 Needs Attention, 😟 High Risk)
   • Comparisons: ONE comparison table, never explain each item separately

3. RELATED DATA (only when available in tool result and adds value)
   • Product → Supplier, Category, Purchase Orders, Invoices, Stock Logs, Forecast, Anomalies
   • Supplier → Products, Inventory Value, Purchase Orders, Latest Purchases
   • Customer → Invoices, Revenue, Products Purchased, Outstanding Balance
   • Employee → Invoices Created, Revenue Generated, Profit Generated, Stock Transactions

4. HIGHLIGHTS (max 4 bullets, one sentence each)
   ## Highlights
   Each bullet must say something the raw table doesn't already show at a glance — a ratio, a concentration, a comparison, or a flag — not a restated cell value.
   BAD: "Highest valuation is Laptop Pro 15 at 3,315,000."
   GOOD: "Laptop Pro 15 alone makes up ~43% of your total inventory value — heavy exposure in one SKU."
   BAD: "TechElectro Solutions holds the highest inventory value."
   GOOD: "TechElectro Solutions holds 78.88% of inventory value — a single-supplier dependency risk."
   Use fewer than 4 bullets, or skip Highlights, if there's genuinely nothing worth flagging.
   NEVER add "Summary", "Business Insights", "Strategic Insights", or "Executive Summary" sections.
   One response = at most ONE Highlights section, and nothing after it.

5. NOTES (only if data is missing from tool result)
   Combine missing fields into ONE line, not one bullet per field.
   GOOD: "Purchase order history and lead-time data aren't available for this query."
   Skip this section if only one minor, non-central field is missing.

6. NO RECOMMENDATIONS unless the user explicitly asked for recommendations, suggestions, optimization, or advice.

7. COMPARISONS & TRENDS
   • If tool result contains comparison data, present it as a table.
   • If hasHistoricalData is false, mention it once, briefly, only if the user asked about trends/growth.

8. CALCULATIONS from tool result data only — never estimate:
   Revenue, Profit, Margin, Valuation = quantity × costPrice, Inventory Turnover, AOV, Growth %

9. TONE
   Write like a knowledgeable colleague pointing things out, not a report generator. Short, direct sentences. Flag what's notable, risky, or surprising if the numbers support it.

10. HARD STOP. After the Highlights (or Notes) section, stop. No wrap-up paragraph, no restatement, no "in summary."


11. READ-ONLY. Politely refuse any write request.
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
      const contextKey = getContextKey(organizationId, userId, conversationId);
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
