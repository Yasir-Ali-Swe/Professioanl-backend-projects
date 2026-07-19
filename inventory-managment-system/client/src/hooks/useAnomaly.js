import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as anomalyApi from "@/api/anomaly.api";

// ============ QUERY KEYS ============
const ANOMALY_KEYS = {
  all: ["anomalies"],
  list: (filters) => [...ANOMALY_KEYS.all, "list", { ...filters }],
  detail: (id) => [...ANOMALY_KEYS.all, "detail", id],
};

// ============ QUERY HOOKS ============

/**
 * Get all anomalies with pagination and filters
 * Query Key: ["anomalies", "list", { filters }]
 */
export const useAnomalies = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ANOMALY_KEYS.list(filters),
    queryFn: () => anomalyApi.getAnomalies(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
};

/**
 * Get anomaly by ID
 * Query Key: ["anomalies", "detail", id]
 */
export const useAnomalyById = (id, options = {}) => {
  return useQuery({
    queryKey: ANOMALY_KEYS.detail(id),
    queryFn: () => anomalyApi.getAnomalyById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Resolve an anomaly
 * Invalidates: ["anomalies"] and specific anomaly detail
 */
export const useResolveAnomaly = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => anomalyApi.resolveAnomaly(id, data),
    onSuccess: (data, variables) => {
      toast.success(data.message || "Anomaly resolved successfully!");

      queryClient.invalidateQueries({
        queryKey: ANOMALY_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: ANOMALY_KEYS.detail(variables.id),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to resolve anomaly. Please try again.",
      );
    },
  });
};

/**
 * Run anomaly detection manually
 * Invalidates: ["anomalies"] on success
 */
export const useRunAnomalyDetection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: anomalyApi.runAnomalyDetection,
    onSuccess: (data) => {
      toast.success(
        data.message || "Anomaly detection completed successfully!",
      );

      queryClient.invalidateQueries({
        queryKey: ANOMALY_KEYS.all,
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to run anomaly detection. Please try again.",
      );
    },
  });
};
