import ChatLog from "../models/chatLog.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const conversationToolsDeclaration = {
  name: "get_conversation_history",
  description: `
Retrieve conversation history for the current user.

Use this tool when the user asks about:
- Previous conversations
- What they asked before
- Chat history
- Earlier questions
- Previous queries
- Conversation context
`,
  parameters: {
    type: "object",
    properties: {
      conversationId: {
        type: "string",
        description: "The conversation ID to fetch history for.",
      },
      limit: {
        type: "integer",
        description: "Number of entries to return (default: 10).",
        minimum: 1,
        maximum: 50,
      },
    },
    required: ["conversationId"],
  },
};

export const conversationToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const { conversationId, limit = 10 } = args;

  if (!conversationId) {
    return { error: "conversationId is required" };
  }

  const match = applyScopeFilter(scope, organizationId, {
    conversationId,
  });

  const logs = await ChatLog.find(match)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const parsedLogs = logs.map((log) => {
    let response = log.response;
    try {
      response = JSON.parse(log.response);
    } catch (e) {
      // Not JSON, use as is
    }
    return {
      ...log,
      response,
    };
  });

  return sanitizeForModel({
    conversationId,
    entries: parsedLogs,
    count: parsedLogs.length,
  });
};
