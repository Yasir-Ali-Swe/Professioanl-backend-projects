import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as forecastApi from "@/api/forecast.api";

// ============ QUERY KEYS ============
const FORECAST_KEYS = {
  all: ["forecast"],
  product: (id) => [...FORECAST_KEYS.all, "product", id],
  allForecasts: (filters) => [...FORECAST_KEYS.all, "all", { ...filters }],
  reorderSuggestions: (filters) => [
    ...FORECAST_KEYS.all,
    "reorderSuggestions",
    { ...filters },
  ],
};

// ============ QUERY HOOKS ============

/**
 * Get forecast for a specific product
 * Query Key: ["forecast", "product", id]
 */
export const useForecastForProduct = (id, options = {}) => {
  return useQuery({
    queryKey: FORECAST_KEYS.product(id),
    queryFn: () => forecastApi.getForecastForProduct(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Get all forecasts
 * Query Key: ["forecast", "all", { filters }]
 */
export const useAllForecasts = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: FORECAST_KEYS.allForecasts(filters),
    queryFn: () => forecastApi.getAllForecasts(filters),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get pending reorder suggestions
 * Query Key: ["forecast", "reorderSuggestions", { filters }]
 */
export const useReorderSuggestions = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: FORECAST_KEYS.reorderSuggestions(filters),
    queryFn: () => forecastApi.getReorderSuggestions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Generate reorder suggestion for a product
 * Invalidates: reorder suggestions and forecast on success
 */
export const useGenerateReorderSuggestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: forecastApi.generateReorderSuggestion,
    onSuccess: (data, variables) => {
      if (data.data) {
        toast.success(
          data.message || "Reorder suggestion generated successfully!",
        );
      } else {
        toast.info(data.message || "No reorder needed at this time.");
      }

      // Invalidate reorder suggestions and forecast queries
      queryClient.invalidateQueries({
        queryKey: FORECAST_KEYS.reorderSuggestions(),
      });
      queryClient.invalidateQueries({
        queryKey: FORECAST_KEYS.product(variables),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to generate reorder suggestion. Please try again.",
      );
    },
  });
};

/**
 * Approve a reorder suggestion (creates purchase order)
 * Invalidates: reorder suggestions, purchase orders, and forecast
 */
export const useApproveReorderSuggestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: forecastApi.approveReorderSuggestion,
    onSuccess: (data, variables) => {
      toast.success(
        data.message || "Suggestion approved! Purchase order created.",
      );

      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: FORECAST_KEYS.reorderSuggestions(),
      });
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders"],
      });
      queryClient.invalidateQueries({
        queryKey: FORECAST_KEYS.product(),
      });
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to approve suggestion. Please try again.",
      );
    },
  });
};

/**
 * Dismiss a reorder suggestion
 * Invalidates: reorder suggestions
 */
export const useDismissReorderSuggestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: forecastApi.dismissReorderSuggestion,
    onSuccess: (data, variables) => {
      toast.success(data.message || "Suggestion dismissed successfully.");

      queryClient.invalidateQueries({
        queryKey: FORECAST_KEYS.reorderSuggestions(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to dismiss suggestion. Please try again.",
      );
    },
  });
};

/**
 * Refresh/regenerate forecast for a specific product
 * Invalidates: ["forecast"] on success
 */
export const useRefreshForecast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId) => forecastApi.getForecastForProduct(productId),
    onSuccess: (data) => {
      toast.success(data.message || "Forecast refreshed successfully!");
      queryClient.invalidateQueries({
        queryKey: FORECAST_KEYS.all,
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to refresh forecast. Please try again."
      );
    },
  });
};
