import { v4 as uuidv4 } from "uuid";
import ChatLog from "../models/chatLog.model.js";
import { GeminiChatService } from "../services/geminiChatService.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../config/env.js";

const geminiService = new GeminiChatService(GEMINI_API_KEY);

const buildConversationHistory = async (
  conversationId,
  userId,
  organizationId,
  limit = 6,
) => {
  const query = {
    conversationId,
    userId,
  };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  const logs = await ChatLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const chronologicalLogs = logs.reverse();

  const history = [];
  let lastEntityRefs = null;

  for (const log of chronologicalLogs) {
    history.push({
      role: "user",
      parts: log.query,
    });

    let responseText = log.response;
    try {
      const parsed = JSON.parse(log.response);
      if (parsed.markdown) {
        responseText = parsed.markdown;
      } else if (parsed.summary) {
        responseText = parsed.summary;
      }
    } catch (e) {
      // Not JSON, use as is
    }

    history.push({
      role: "model",
      parts: responseText,
    });

    if (log.metadata && log.metadata.entityRefs) {
      lastEntityRefs = log.metadata.entityRefs;
    }
  }

  let contextNote = null;
  if (lastEntityRefs && Object.keys(lastEntityRefs).length > 0) {
    const refs = [];
    for (const [key, value] of Object.entries(lastEntityRefs)) {
      refs.push(`${key}: ${value}`);
    }
    contextNote = `The user was last looking at: ${refs.join(", ")}. Resolve any pronouns ("that", "this", "it") using this context.`;
  }

  return { history, contextNote, lastEntityRefs };
};

export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const user = req.user;
    const organizationId = req.organizationId || null;
    const scope = req.chatbotScope || "org";

    const convId = conversationId || uuidv4();

    const { history, contextNote } = await buildConversationHistory(
      convId,
      user._id,
      organizationId,
      6,
    );

    const geminiHistory = history.map((entry) => ({
      role: entry.role === "user" ? "user" : "model",
      parts: entry.parts,
    }));

    const scopeContext = {
      scope,
      organizationId,
    };

    const response = await geminiService.processMessage(
      user._id,
      convId,
      message,
      geminiHistory,
      scopeContext,
      contextNote,
    );

    const chatLog = new ChatLog({
      organizationId: organizationId,
      userId: user._id,
      conversationId: convId,
      query: message,
      response: JSON.stringify({
        markdown: response.markdown,
        intent: response.intent,
        entityRefs: response.entityRefs,
      }),
      intent: response.intent || null,
      metadata: {
        entityRefs: response.entityRefs || null,
      },
    });

    await chatLog.save();

    return res.status(200).json({
      success: true,
      markdown: response.markdown,
      conversationId: convId,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const user = req.user;
    const organizationId = req.organizationId || null;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required",
      });
    }

    const query = {
      conversationId,
      userId: user._id,
    };

    if (organizationId) {
      query.organizationId = organizationId;
    }

    const logs = await ChatLog.find(query).sort({ createdAt: 1 }).lean();

    const formattedLogs = logs.map((log) => {
      let markdown = "";
      let intent = null;
      let metadata = null;

      try {
        const parsed = JSON.parse(log.response);
        markdown = parsed.markdown || JSON.stringify(parsed);
        intent = parsed.intent || log.intent;
        metadata = log.metadata;
      } catch (e) {
        markdown = log.response;
        intent = log.intent;
        metadata = log.metadata;
      }

      return {
        id: log._id,
        query: log.query,
        response: markdown,
        intent: intent,
        metadata: metadata,
        createdAt: log.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        conversationId,
        logs: formattedLogs,
        count: formattedLogs.length,
      },
    });
  } catch (error) {
    console.error("Error in getHistory:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
