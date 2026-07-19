import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as categoryApi from "@/api/category.api";

// ============ QUERY KEYS ============
const CATEGORY_KEYS = {
  all: ["categories"],
  lists: () => [...CATEGORY_KEYS.all, "list"],
  list: (filters) => [...CATEGORY_KEYS.lists(), { ...filters }],
  details: () => [...CATEGORY_KEYS.all, "detail"],
  detail: (id) => [...CATEGORY_KEYS.details(), id],
  bySlug: (slug) => [...CATEGORY_KEYS.all, "slug", slug],
  products: (id) => [...CATEGORY_KEYS.all, "products", id],
};

// ============ QUERY HOOKS ============

/**
 * Get all categories with optional filters
 * Query Key: ["categories", "list", { filters }]
 */
export const useCategories = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: CATEGORY_KEYS.list(filters),
    queryFn: () => categoryApi.getAllCategories(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Get category by ID
 * Query Key: ["categories", "detail", id]
 */
export const useCategoryById = (id, options = {}) => {
  return useQuery({
    queryKey: CATEGORY_KEYS.detail(id),
    queryFn: () => categoryApi.getCategoryById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get category by slug
 * Query Key: ["categories", "slug", slug]
 */
export const useCategoryBySlug = (slug, options = {}) => {
  return useQuery({
    queryKey: CATEGORY_KEYS.bySlug(slug),
    queryFn: () => categoryApi.getCategoryBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get products in a category
 * Query Key: ["categories", "products", id, { filters }]
 */
export const useCategoryProducts = (id, filters = {}, options = {}) => {
  return useQuery({
    queryKey: CATEGORY_KEYS.products(id, filters),
    queryFn: () => categoryApi.getCategoryProducts(id, filters),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Create a new category
 * Invalidates: ["categories"] on success
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoryApi.createCategory,
    onSuccess: (data) => {
      toast.success(data.message || "Category created successfully!");

      // Invalidate all category lists
      queryClient.invalidateQueries({
        queryKey: CATEGORY_KEYS.lists(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to create category. Please try again.",
      );
    },
  });
};

/**
 * Update a category
 * Invalidates: ["categories"] and specific category detail
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => categoryApi.updateCategory(id, data),
    onSuccess: (data, variables) => {
      toast.success(data.message || "Category updated successfully!");

      // Invalidate all category lists and the specific category detail
      queryClient.invalidateQueries({
        queryKey: CATEGORY_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: CATEGORY_KEYS.detail(variables.id),
      });
      // Also invalidate by slug if needed
      queryClient.invalidateQueries({
        queryKey: CATEGORY_KEYS.all,
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update category. Please try again.",
      );
    },
  });
};

/**
 * Delete a category
 * Invalidates: ["categories"] on success
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoryApi.deleteCategory,
    onSuccess: (data) => {
      toast.success(data.message || "Category deleted successfully!");

      // Invalidate all category queries
      queryClient.invalidateQueries({
        queryKey: CATEGORY_KEYS.all,
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete category. Please try again.",
      );
    },
  });
};
