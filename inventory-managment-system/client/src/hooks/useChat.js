// src/hooks/useChat.js

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as chatApi from "@/api/chat.api";

// ============ QUERY KEYS ============
const CHAT_KEYS = {
  all: ["chat"],
  conversationsRoot: () => [...CHAT_KEYS.all, "conversations"],
  conversations: () => [...CHAT_KEYS.conversationsRoot()],
  historyRoot: () => [...CHAT_KEYS.all, "history"],
  history: (conversationId) => [...CHAT_KEYS.historyRoot(), conversationId],
};

// ============ QUERY HOOKS ============

// Get all conversations for the sidebar
export const useConversations = (options = {}) => {
  return useQuery({
    queryKey: CHAT_KEYS.conversations(),
    queryFn: () => chatApi.getConversations(),
    staleTime: 0,              // always consider stale so invalidation always refetches
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    ...options,
  });
};

// Get conversation history by ID
export const useChatHistory = (conversationId, options = {}) => {
  return useQuery({
    queryKey: CHAT_KEYS.history(conversationId),
    queryFn: () => chatApi.getChatHistory(conversationId),
    enabled: Boolean(conversationId),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

// Streaming chat mutation
export const useChatWithAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      message,
      conversationId,
      signal,
      onChunk,
      onThinking,
      onComplete,
    }) =>
      chatApi.chatWithAIStream(
        { message, conversationId, signal },
        { onChunk, onThinking, onComplete },
      ),
    onSuccess: () => {
      // Invalidate both conversations list and history
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.conversations(),
      });
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.historyRoot(),
      });
    },
    onError: (error) => {
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
