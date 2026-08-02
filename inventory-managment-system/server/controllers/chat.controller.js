import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import ChatLog from "../models/chatLog.model.js";
import { GeminiChatService } from "../services/geminiChatService.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

const geminiService = new GeminiChatService(process.env.GEMINI_API_KEY);

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
  const accumulatedEntityRefs = {};

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
      Object.assign(accumulatedEntityRefs, log.metadata.entityRefs);
    }
  }

  let contextNote = null;
  if (Object.keys(accumulatedEntityRefs).length > 0) {
    const refs = Object.entries(accumulatedEntityRefs).map(
      ([key, value]) => `${key}: ${value}`,
    );
    contextNote = `Recent context entities in conversation: ${refs.join(
      ", ",
    )}. Resolve pronouns ("this", "that", "it", "them", "these", "their") using this active context.`;
  }

  return { history, contextNote, lastEntityRefs: accumulatedEntityRefs };
};

// ============================================================
// Non-streaming endpoint (existing - unchanged)
// ============================================================
export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    console.log("Message is called.");

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

// ============================================================
// Streaming endpoint (NEW)
// ============================================================
export const sendMessageStream = async (req, res) => {
  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if present
  res.flushHeaders();

  try {
    const { message, conversationId } = req.body;
    console.log("Message Stream is called.")

    if (!message || message.trim().length === 0) {
      res.write(
        `data: ${JSON.stringify({
          error: "Message is required",
          done: true,
        })}\n\n`,
      );
      res.end();
      return;
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

    // Send initial "thinking" event
    res.write(
      `data: ${JSON.stringify({
        event: "thinking",
        message: "🤔 Analyzing your request...",
        done: false,
      })}\n\n`,
    );

    let fullMarkdown = "";
    let finalIntent = "";
    let finalEntityRefs = null;
    let hasError = false;

    // Stream the response
    for await (const event of geminiService.processMessageStream(
      user._id,
      convId,
      message,
      geminiHistory,
      scopeContext,
      contextNote,
    )) {
      if (event.status) {
        res.write(
          `data: ${JSON.stringify({
            event: "thinking",
            message: event.status,
            done: false,
          })}\n\n`,
        );
        continue;
      }

      if (event.error) {
        hasError = true;
        res.write(
          `data: ${JSON.stringify({
            error: event.chunk,
            done: true,
          })}\n\n`,
        );
        res.end();
        return;
      }

      if (event.done) {
        // Final event with complete data
        fullMarkdown = event.fullMarkdown || fullMarkdown;
        finalIntent = event.intent || "";
        finalEntityRefs = event.entityRefs || null;
        break;
      }

      // Streaming chunk
      if (event.chunk) {
        fullMarkdown += event.chunk;
        res.write(
          `data: ${JSON.stringify({
            chunk: event.chunk,
            done: false,
          })}\n\n`,
        );
      }
    }

    // Save to ChatLog BEFORE sending final done event to client to avoid race conditions
    if (!hasError && fullMarkdown) {
      try {
        const chatLog = new ChatLog({
          organizationId: organizationId,
          userId: user._id,
          conversationId: convId,
          query: message,
          response: JSON.stringify({
            markdown: fullMarkdown,
            intent: finalIntent,
            entityRefs: finalEntityRefs,
          }),
          intent: finalIntent || null,
          metadata: {
            entityRefs: finalEntityRefs || null,
          },
        });
        console.log("ChatLog: ", chatLog);
        await chatLog.save();
        console.log(`✅ Saved ChatLog to DB for conversationId: ${convId}`);
      } catch (saveErr) {
        console.error("❌ Error saving ChatLog to DB:", saveErr.message);
      }
    }

    // Send final completion event to client ONLY AFTER ChatLog is saved
    res.write(
      `data: ${JSON.stringify({
        done: true,
        conversationId: convId,
        intent: finalIntent,
        entityRefs: finalEntityRefs,
      })}\n\n`,
    );

    res.end();
  } catch (error) {
    console.error("Error in sendMessageStream:", error);
    res.write(
      `data: ${JSON.stringify({
        error: error.message || "Internal server error",
        done: true,
      })}\n\n`,
    );
    res.end();
  }
};

// ============================================================
// Get conversation history (existing - unchanged)
// ============================================================
export const getHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const user = req.user;

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

// ============================================================
// List all conversations for the current user (NEW)
// ============================================================
export const listConversations = async (req, res) => {
  try {
    const user = req.user;
    const organizationId = req.organizationId || null;

    const userIdObj = mongoose.Types.ObjectId.isValid(user._id)
      ? new mongoose.Types.ObjectId(user._id)
      : user._id;

    const query = {
      userId: userIdObj,
    };

    if (organizationId) {
      query.organizationId = mongoose.Types.ObjectId.isValid(organizationId)
        ? new mongoose.Types.ObjectId(organizationId)
        : organizationId;
    }

    // Get all distinct conversation IDs with their latest message.
    // Sort ascending FIRST so $first = oldest message (real title) and
    // $last = newest message (for updatedAt ordering).
    const conversations = await ChatLog.aggregate([
      { $match: query },
      {
        $sort: { createdAt: 1 }, // ascending: oldest first
      },
      {
        $group: {
          _id: "$conversationId",
          firstMessage: { $first: "$query" }, // oldest message = real conversation title
          lastMessage: { $last: "$query" },   // newest message
          createdAt: { $first: "$createdAt" }, // when the conversation started
          updatedAt: { $last: "$createdAt" },  // when it was last active
          messageCount: { $sum: 1 },
        },
      },
      {
        $sort: { updatedAt: -1 }, // show most recently active conversations first
      },
    ]);

    // Format the response
    const formattedConversations = conversations.map((conv) => ({
      id: conv._id,
      firstMessage: conv.firstMessage || "New conversation",
      lastMessage: conv.lastMessage || "New conversation",
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv.messageCount,
    }));

    return res.status(200).json({
      success: true,
      data: {
        conversations: formattedConversations,
        count: formattedConversations.length,
      },
    });
  } catch (error) {
    console.error("Error in listConversations:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
