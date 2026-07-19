import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as stockApi from "@/api/stock.api";

// ============ QUERY KEYS ============
const STOCK_KEYS = {
  all: ["stock"],
  history: (productId, filters) => [
    ...STOCK_KEYS.all,
    "history",
    productId,
    { ...filters },
  ],
  lowStock: (filters) => [...STOCK_KEYS.all, "lowStock", { ...filters }],
  summary: () => [...STOCK_KEYS.all, "summary"],
  allStock: (filters) => [...STOCK_KEYS.all, "all", { ...filters }],
  productDetails: (productId) => [...STOCK_KEYS.all, "product", productId],
};

// ============ QUERY HOOKS ============

/**
 * Get stock history for a specific product
 * Query Key: ["stock", "history", productId, { filters }]
 */
export const useStockHistory = (productId, filters = {}, options = {}) => {
  return useQuery({
    queryKey: STOCK_KEYS.history(productId, filters),
    queryFn: () => stockApi.getStockHistory(productId, filters),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Get low stock products
 * Query Key: ["stock", "lowStock", { filters }]
 */
export const useLowStockProducts = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: STOCK_KEYS.lowStock(filters),
    queryFn: () => stockApi.getLowStockProducts(filters),
    staleTime: 1 * 60 * 1000, // 1 minute - frequently updated
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    ...options,
  });
};

/**
 * Get stock summary
 * Query Key: ["stock", "summary"]
 */
export const useStockSummary = (options = {}) => {
  return useQuery({
    queryKey: STOCK_KEYS.summary(),
    queryFn: () => stockApi.getStockSummary(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes
    ...options,
  });
};

/**
 * Get all stock with pagination and filters
 * Query Key: ["stock", "all", { filters }]
 */
export const useAllStock = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: STOCK_KEYS.allStock(filters),
    queryFn: () => stockApi.getAllStock(filters),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Get product stock details
 * Query Key: ["stock", "product", productId]
 */
export const useProductStockDetails = (productId, options = {}) => {
  return useQuery({
    queryKey: STOCK_KEYS.productDetails(productId),
    queryFn: () => stockApi.getProductStockDetails(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Perform stock-in operation
 * Invalidates: stock summary, all stock, product details, and product queries
 */
export const useStockIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stockApi.stockIn,
    onSuccess: (data) => {
      toast.success(data.message || "Stock-in successful!");

      // Invalidate all stock-related queries
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.summary(),
      });
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.productDetails(data.data?.product?._id),
      });
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.lowStock(),
      });
      // Also invalidate product queries
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Stock-in failed. Please try again.",
      );
    },
  });
};

/**
 * Perform stock-out operation
 * Invalidates: stock summary, all stock, product details, and product queries
 */
export const useStockOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stockApi.stockOut,
    onSuccess: (data) => {
      toast.success(data.message || "Stock-out successful!");

      // Invalidate all stock-related queries
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.summary(),
      });
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.productDetails(data.data?.product?._id),
      });
      queryClient.invalidateQueries({
        queryKey: STOCK_KEYS.lowStock(),
      });
      // Also invalidate product queries
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Stock-out failed. Please try again.",
      );
    },
  });
};
