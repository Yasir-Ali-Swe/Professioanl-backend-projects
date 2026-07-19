import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as chatApi from "@/api/chat.api";

// ============ QUERY KEYS ============
const CHAT_KEYS = {
  all: ["chat"],
  history: (params) => [...CHAT_KEYS.all, "history", { ...params }],
  analytics: () => [...CHAT_KEYS.all, "analytics"],
};

// ============ QUERY HOOKS ============

/**
 * Get chat history with optional filters
 * Query Key: ["chat", "history", { limit, intent, startDate, endDate }]
 */
export const useChatHistory = (params = {}, options = {}) => {
  return useQuery({
    queryKey: CHAT_KEYS.history(params),
    queryFn: () => chatApi.getChatHistory(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Get chat analytics (intent distribution)
 * Query Key: ["chat", "analytics"]
 */
export const useChatAnalytics = (options = {}) => {
  return useQuery({
    queryKey: CHAT_KEYS.analytics(),
    queryFn: () => chatApi.getChatAnalytics(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Send a message to the AI chat
 * Invalidates: ["chat", "history"] and ["chat", "analytics"] on success
 */
export const useChatWithAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApi.chatWithAI,
    onSuccess: (data, variables) => {
      // Don't show toast for every message, let the component handle it
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.history(),
      });
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.analytics(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to send message. Please try again.",
      );
    },
  });
};

/**
 * Clear conversation context
 * Invalidates: ["chat", "history"] on success
 */
export const useClearContext = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApi.clearContext,
    onSuccess: (data) => {
      toast.success(
        data.message || "Conversation context cleared successfully!",
      );

      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.history(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to clear context. Please try again.",
      );
    },
  });
};
