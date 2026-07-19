import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as purchaseOrderApi from "@/api/purchaseOrder.api";

// ============ QUERY KEYS ============
const PURCHASE_ORDER_KEYS = {
  all: ["purchaseOrders"],
  lists: () => [...PURCHASE_ORDER_KEYS.all, "list"],
  list: (filters) => [...PURCHASE_ORDER_KEYS.lists(), { ...filters }],
  details: () => [...PURCHASE_ORDER_KEYS.all, "detail"],
  detail: (id) => [...PURCHASE_ORDER_KEYS.details(), id],
};

// ============ QUERY HOOKS ============

/**
 * Get all purchase orders with pagination and filters
 * Query Key: ["purchaseOrders", "list", { filters }]
 */
export const usePurchaseOrders = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: PURCHASE_ORDER_KEYS.list(filters),
    queryFn: () => purchaseOrderApi.getAllPurchaseOrders(filters),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Get purchase order by ID
 * Query Key: ["purchaseOrders", "detail", id]
 */
export const usePurchaseOrderById = (id, options = {}) => {
  return useQuery({
    queryKey: PURCHASE_ORDER_KEYS.detail(id),
    queryFn: () => purchaseOrderApi.getPurchaseOrderById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Create a new purchase order
 * Invalidates: ["purchaseOrders"] on success
 */
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrderApi.createPurchaseOrder,
    onSuccess: (data) => {
      toast.success(data.message || "Purchase order created successfully!");

      queryClient.invalidateQueries({
        queryKey: PURCHASE_ORDER_KEYS.lists(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to create purchase order. Please try again.",
      );
    },
  });
};

/**
 * Approve a purchase order
 * Invalidates: ["purchaseOrders"] and specific detail
 */
export const useApprovePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrderApi.approvePurchaseOrder,
    onSuccess: (data, variables) => {
      toast.success(data.message || "Purchase order approved successfully!");

      queryClient.invalidateQueries({
        queryKey: PURCHASE_ORDER_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PURCHASE_ORDER_KEYS.detail(variables),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to approve purchase order. Please try again.",
      );
    },
  });
};

/**
 * Reject a purchase order
 * Invalidates: ["purchaseOrders"] and specific detail
 */
export const useRejectPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrderApi.rejectPurchaseOrder,
    onSuccess: (data, variables) => {
      toast.success(data.message || "Purchase order rejected successfully!");

      queryClient.invalidateQueries({
        queryKey: PURCHASE_ORDER_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PURCHASE_ORDER_KEYS.detail(variables),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to reject purchase order. Please try again.",
      );
    },
  });
};

/**
 * Fulfill a purchase order (add to stock)
 * Invalidates: ["purchaseOrders"], ["stock"], and ["products"]
 */
export const useFulfillPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrderApi.fulfillPurchaseOrder,
    onSuccess: (data, variables) => {
      toast.success(
        data.message || "Purchase order fulfilled successfully! Stock updated.",
      );

      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: PURCHASE_ORDER_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PURCHASE_ORDER_KEYS.detail(variables),
      });
      queryClient.invalidateQueries({
        queryKey: ["stock"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to fulfill purchase order. Please try again.",
      );
    },
  });
};
