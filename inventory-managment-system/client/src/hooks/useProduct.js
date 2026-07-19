import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as productApi from "@/api/product.api";

// ============ QUERY KEYS ============
const PRODUCT_KEYS = {
  all: ["products"],
  lists: () => [...PRODUCT_KEYS.all, "list"],
  list: (filters) => [...PRODUCT_KEYS.lists(), { ...filters }],
  details: () => [...PRODUCT_KEYS.all, "detail"],
  detail: (id) => [...PRODUCT_KEYS.details(), id],
};

// ============ QUERY HOOKS ============

/**
 * Get all products with pagination and filters
 * Query Key: ["products", "list", { filters }]
 */
export const useProducts = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(filters),
    queryFn: () => productApi.getAllProducts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Get product by ID with calculated fields
 * Query Key: ["products", "detail", id]
 */
export const useProductById = (id, options = {}) => {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(id),
    queryFn: () => productApi.getProductById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Create a new product
 * Invalidates: ["products"] on success
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: (data) => {
      toast.success(data.message || "Product created successfully!");

      // Invalidate all product lists
      queryClient.invalidateQueries({
        queryKey: PRODUCT_KEYS.lists(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to create product. Please try again.",
      );
    },
  });
};

/**
 * Update a product
 * Invalidates: ["products"] and specific product detail
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => productApi.updateProduct(id, data),
    onSuccess: (data, variables) => {
      toast.success(data.message || "Product updated successfully!");

      // Invalidate all product lists and the specific product detail
      queryClient.invalidateQueries({
        queryKey: PRODUCT_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PRODUCT_KEYS.detail(variables.id),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update product. Please try again.",
      );
    },
  });
};

/**
 * Toggle product active status
 * Invalidates: ["products"] and specific product detail
 */
export const useToggleProductActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }) =>
      productApi.toggleProductActive(id, { isActive }),
    onSuccess: (data, variables) => {
      toast.success(
        data.message ||
          `Product ${variables.isActive ? "activated" : "deactivated"} successfully!`,
      );

      // Invalidate all product lists and the specific product detail
      queryClient.invalidateQueries({
        queryKey: PRODUCT_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PRODUCT_KEYS.detail(variables.id),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update product status. Please try again.",
      );
    },
  });
};

/**
 * Upload product image
 * Invalidates: ["products"] and specific product detail
 */
export const useUploadProductImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }) =>
      productApi.uploadProductImage(id, formData),
    onSuccess: (data, variables) => {
      toast.success(data.message || "Product image uploaded successfully!");

      // Invalidate all product lists and the specific product detail
      queryClient.invalidateQueries({
        queryKey: PRODUCT_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PRODUCT_KEYS.detail(variables.id),
      });

      // Update the product detail cache with new image
      queryClient.setQueryData(PRODUCT_KEYS.detail(variables.id), data);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to upload product image. Please try again.",
      );
    },
  });
};
