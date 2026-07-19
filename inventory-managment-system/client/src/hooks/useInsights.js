import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as insightsApi from "@/api/insights.api";

// ============ QUERY KEYS ============
const INSIGHTS_KEYS = {
  all: ["insights"],
  latest: (params) => [...INSIGHTS_KEYS.all, "latest", { ...params }],
  history: (params) => [...INSIGHTS_KEYS.all, "history", { ...params }],
};

// ============ QUERY HOOKS ============

/**
 * Get the latest AI insight
 * Query Key: ["insights", "latest", { period }]
 */
export const useLatestInsight = (params = {}, options = {}) => {
  return useQuery({
    queryKey: INSIGHTS_KEYS.latest(params),
    queryFn: () => insightsApi.getLatestInsight(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    ...options,
  });
};

/**
 * Get insights history
 * Query Key: ["insights", "history", { limit }]
 */
export const useInsightsHistory = (params = {}, options = {}) => {
  return useQuery({
    queryKey: INSIGHTS_KEYS.history(params),
    queryFn: () => insightsApi.getInsightsHistory(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Generate a new insight (non-streaming)
 * Invalidates: ["insights"] on success
 */
export const useGenerateInsightNow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insightsApi.generateInsightNow,
    onSuccess: (data) => {
      toast.success(data.message || "Insight generated successfully!");

      queryClient.invalidateQueries({
        queryKey: INSIGHTS_KEYS.all,
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to generate insight. Please try again.",
      );
    },
  });
};

/**
 * Generate insight with streaming response
 * Returns a promise with the stream data
 */
export const useGenerateInsightStream = () => {
  return useMutation({
    mutationFn: insightsApi.generateInsightStream,
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to generate insight stream. Please try again.",
      );
    },
  });
};
