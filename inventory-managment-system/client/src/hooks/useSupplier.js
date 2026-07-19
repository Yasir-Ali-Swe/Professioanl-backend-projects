import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as supplierApi from "@/api/supplier.api";

// ============ QUERY KEYS ============
const SUPPLIER_KEYS = {
  all: ["suppliers"],
  lists: () => [...SUPPLIER_KEYS.all, "list"],
  list: (filters) => [...SUPPLIER_KEYS.lists(), { ...filters }],
  details: () => [...SUPPLIER_KEYS.all, "detail"],
  detail: (id) => [...SUPPLIER_KEYS.details(), id],
  withProducts: (id) => [...SUPPLIER_KEYS.all, "withProducts", id],
};

// ============ QUERY HOOKS ============

/**
 * Get all suppliers
 * Query Key: ["suppliers", "list", { filters }]
 */
export const useSuppliers = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: SUPPLIER_KEYS.list(filters),
    queryFn: () => supplierApi.getAllSuppliers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Get supplier by ID with their products
 * Query Key: ["suppliers", "withProducts", id]
 */
export const useSupplierWithProducts = (id, options = {}) => {
  return useQuery({
    queryKey: SUPPLIER_KEYS.withProducts(id),
    queryFn: () => supplierApi.getSupplierByIdWithProducts(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Create a new supplier
 * Invalidates: ["suppliers"] on success
 */
export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supplierApi.createSupplier,
    onSuccess: (data) => {
      toast.success(data.message || "Supplier created successfully!");

      // Invalidate all supplier lists
      queryClient.invalidateQueries({
        queryKey: SUPPLIER_KEYS.lists(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to create supplier. Please try again.",
      );
    },
  });
};

/**
 * Update a supplier
 * Invalidates: ["suppliers"] and specific supplier details
 */
export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => supplierApi.updateSupplier(id, data),
    onSuccess: (data, variables) => {
      toast.success(data.message || "Supplier updated successfully!");

      // Invalidate all supplier lists and specific supplier details
      queryClient.invalidateQueries({
        queryKey: SUPPLIER_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: SUPPLIER_KEYS.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: SUPPLIER_KEYS.withProducts(variables.id),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update supplier. Please try again.",
      );
    },
  });
};

/**
 * Delete a supplier
 * Invalidates: ["suppliers"] on success
 */
export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supplierApi.deleteSupplier,
    onSuccess: (data) => {
      toast.success(data.message || "Supplier deleted successfully!");

      // Invalidate all supplier queries
      queryClient.invalidateQueries({
        queryKey: SUPPLIER_KEYS.all,
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete supplier. Please try again.",
      );
    },
  });
};
