import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as superAdminApi from "@/api/superAdmin.api";

// ============ QUERY KEYS ============
const SUPER_ADMIN_KEYS = {
  all: ["superAdmin"],
  organizations: () => [...SUPER_ADMIN_KEYS.all, "organizations"],
  organizationsList: (filters) => [
    ...SUPER_ADMIN_KEYS.organizations(),
    { ...filters },
  ],
  organizationDetail: (id) => [...SUPER_ADMIN_KEYS.all, "organization", id],
  analytics: () => [...SUPER_ADMIN_KEYS.all, "analytics"],
  subscriptions: () => [...SUPER_ADMIN_KEYS.all, "subscriptions"],
  subscriptionsList: (filters) => [
    ...SUPER_ADMIN_KEYS.subscriptions(),
    { ...filters },
  ],
  subscriptionDetail: (id) => [...SUPER_ADMIN_KEYS.all, "subscription", id],
};

// ============ QUERY HOOKS ============

/**
 * Get all organizations with pagination and filters
 * Query Key: ["superAdmin", "organizations", { filters }]
 */
export const useOrganizations = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: SUPER_ADMIN_KEYS.organizationsList(filters),
    queryFn: () => superAdminApi.getAllOrganizations(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Get organization by ID with full details
 * Query Key: ["superAdmin", "organization", id]
 */
export const useOrganizationById = (id, options = {}) => {
  return useQuery({
    queryKey: SUPER_ADMIN_KEYS.organizationDetail(id),
    queryFn: () => superAdminApi.getOrganizationById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get platform analytics dashboard data
 * Query Key: ["superAdmin", "analytics"]
 */
export const usePlatformAnalytics = (options = {}) => {
  return useQuery({
    queryKey: SUPER_ADMIN_KEYS.analytics(),
    queryFn: () => superAdminApi.getPlatformAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    ...options,
  });
};

/**
 * Get all organization subscriptions with pagination and filters
 * Query Key: ["superAdmin", "subscriptions", { filters }]
 */
export const useOrganizationSubscriptions = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: SUPER_ADMIN_KEYS.subscriptionsList(filters),
    queryFn: () => superAdminApi.getAllOrganizationSubscriptions(filters),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

/**
 * Get subscription details for a specific organization
 * Query Key: ["superAdmin", "subscription", id]
 */
export const useOrganizationSubscriptionDetails = (id, options = {}) => {
  return useQuery({
    queryKey: SUPER_ADMIN_KEYS.subscriptionDetail(id),
    queryFn: () => superAdminApi.getOrganizationSubscriptionDetails(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Update organization status (active/suspended/trial)
 * Invalidates: organizations list and organization detail
 */
export const useUpdateOrganizationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) =>
      superAdminApi.updateOrganizationStatus(id, data),
    onSuccess: (data, variables) => {
      toast.success(
        data.message || "Organization status updated successfully!",
      );

      // Invalidate all organization queries
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.organizations(),
      });
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.organizationDetail(variables.id),
      });
      // Also refresh analytics
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.analytics(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to update organization status. Please try again.",
      );
    },
  });
};

/**
 * Delete organization (cascading delete all data)
 * Invalidates: organizations list and analytics
 */
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: superAdminApi.deleteOrganization,
    onSuccess: (data) => {
      toast.success(data.message || "Organization deleted successfully!");

      // Invalidate all organization and analytics queries
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.organizations(),
      });
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.analytics(),
      });
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.subscriptions(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to delete organization. Please try again.",
      );
    },
  });
};

/**
 * Update organization subscription plan
 * Invalidates: organization details, subscriptions list, and analytics
 */
export const useUpdateOrganizationSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) =>
      superAdminApi.updateOrganizationSubscriptionPlan(id, data),
    onSuccess: (data, variables) => {
      toast.success(data.message || "Subscription plan updated successfully!");

      // Invalidate all subscription and organization queries
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.organizations(),
      });
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.organizationDetail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.subscriptions(),
      });
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.subscriptionDetail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_KEYS.analytics(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to update subscription. Please try again.",
      );
    },
  });
};

/**
 * Get platform dashboard stats
 */
export const usePlatformDashboardStats = (options = {}) => {
  return useQuery({
    queryKey: ["superAdmin", "dashboardStats"],
    queryFn: () => superAdminApi.getPlatformDashboardStats(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
