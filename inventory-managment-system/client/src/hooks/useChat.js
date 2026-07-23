import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as chatApi from "@/api/chat.api";

// ============ QUERY KEYS ============
const CHAT_KEYS = {
  all: ["chat"],
  historyRoot: () => [...CHAT_KEYS.all, "history"],
  history: (params) => [...CHAT_KEYS.historyRoot(), { ...params }],
  analyticsRoot: () => [...CHAT_KEYS.all, "analytics"],
  analytics: () => [...CHAT_KEYS.analyticsRoot()],
};

// ============ QUERY HOOKS ============
export const useChatHistory = (params = {}, options = {}) => {
  return useQuery({
    queryKey: CHAT_KEYS.history(params),
    queryFn: () => chatApi.getChatHistory(params),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useChatAnalytics = (options = {}) => {
  return useQuery({
    queryKey: CHAT_KEYS.analytics(),
    queryFn: () => chatApi.getChatAnalytics(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============
export const useChatWithAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      query,
      conversationId,
      signal,
      onChunk,
      onEvent,
      onComplete,
      onTool,
    }) =>
      chatApi.chatWithAIStream(
        { query, conversationId, signal },
        {
          onChunk,
          onEvent,
          onComplete,
          onTool,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.historyRoot(),
      });
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.analyticsRoot(),
      });
    },
    onError: (error) => {
      // Better abort detection – ignore all user‑initiated cancellations
      const isAbortError =
        error?.name === "CanceledError" ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError" ||
        error?.message?.toLowerCase().includes("abort") ||
        error?.message?.toLowerCase().includes("canceled");

      if (isAbortError) {
        return;
      }

      toast.error(
        error.response?.data?.message ||
          "Failed to send message. Please try again.",
      );
    },
  });
};

export const useClearContext = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data = {}) => chatApi.clearContext(data),
    onSuccess: (data, variables) => {
      toast.success(
        data.message || "Conversation context cleared successfully!",
      );
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.historyRoot(),
      });
      if (variables?.conversationId) {
        queryClient.removeQueries({
          queryKey: CHAT_KEYS.history({
            conversationId: variables.conversationId,
          }),
        });
      }
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to clear context. Please try again.",
      );
    },
  });
};
