import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as organizationApi from "@/api/organization.api";

// ============ QUERY KEYS ============
const ORGANIZATION_KEYS = {
  all: ["organization"],
  profile: () => [...ORGANIZATION_KEYS.all, "profile"],
  adminProfile: () => [...ORGANIZATION_KEYS.all, "adminProfile"],
  invoiceDetails: () => [...ORGANIZATION_KEYS.all, "invoiceDetails"],
  users: () => [...ORGANIZATION_KEYS.all, "users"],
  usersList: (filters) => [...ORGANIZATION_KEYS.users(), { ...filters }],
  userDetail: (id) => [...ORGANIZATION_KEYS.all, "user", id],
  dashboardStats: () => [...ORGANIZATION_KEYS.all, "dashboardStats"],
};

// ============ QUERY HOOKS ============

/**
 * Get organization profile
 * Query Key: ["organization", "profile"]
 */
export const useOrganizationProfile = (options = {}) => {
  return useQuery({
    queryKey: ORGANIZATION_KEYS.profile(),
    queryFn: () => organizationApi.getOrganizationProfile(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get organization admin profile
 * Query Key: ["organization", "adminProfile"]
 */
export const useOrganizationAdminProfile = (options = {}) => {
  return useQuery({
    queryKey: ORGANIZATION_KEYS.adminProfile(),
    queryFn: () => organizationApi.getOrganizationAdminProfile(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get organization invoice details
 * Query Key: ["organization", "invoiceDetails"]
 */
export const useOrganizationInvoiceDetails = (options = {}) => {
  return useQuery({
    queryKey: ORGANIZATION_KEYS.invoiceDetails(),
    queryFn: () => organizationApi.getOrganizationInvoiceDetails(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get organization users with pagination and filters
 * Query Key: ["organization", "users", { filters }]
 */
export const useOrganizationUsers = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ORGANIZATION_KEYS.usersList(filters),
    queryFn: () => organizationApi.getOrganizationUsers(filters),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Get organization user by ID
 * Query Key: ["organization", "user", id]
 */
export const useOrganizationUserById = (id, options = {}) => {
  return useQuery({
    queryKey: ORGANIZATION_KEYS.userDetail(id),
    queryFn: () => organizationApi.getOrganizationUserById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get dashboard statistics
 * Query Key: ["organization", "dashboardStats"]
 */
export const useDashboardStats = (options = {}) => {
  return useQuery({
    queryKey: ORGANIZATION_KEYS.dashboardStats(),
    queryFn: () => organizationApi.getDashboardStats(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Update organization profile
 * Invalidates: ["organization", "profile"]
 */
export const useUpdateOrganizationProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.updateOrganizationProfile,
    onSuccess: (data) => {
      toast.success(
        data.message || "Organization profile updated successfully!",
      );
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.profile(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update organization profile. Please try again.",
      );
    },
  });
};

/**
 * Upload organization logo
 * Invalidates: ["organization", "profile"]
 */
export const useUploadOrganizationLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.uploadOrganizationLogo,
    onSuccess: (data) => {
      toast.success(data.message || "Organization logo uploaded successfully!");
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.profile(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to upload logo. Please try again.",
      );
    },
  });
};

/**
 * Update organization admin profile
 * Invalidates: ["organization", "adminProfile"] and ["auth", "user"]
 */
export const useUpdateOrganizationAdminProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.updateOrganizationAdminProfile,
    onSuccess: (data) => {
      toast.success(data.message || "Profile updated successfully!");
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.adminProfile(),
      });
      queryClient.invalidateQueries({
        queryKey: ["auth", "user"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update profile. Please try again.",
      );
    },
  });
};

/**
 * Update organization invoice details
 * Invalidates: ["organization", "invoiceDetails"]
 */
export const useUpdateOrganizationInvoiceDetails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.updateOrganizationInvoiceDetails,
    onSuccess: (data) => {
      toast.success(data.message || "Invoice settings updated successfully!");
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.invoiceDetails(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update invoice settings. Please try again.",
      );
    },
  });
};

/**
 * Invite organization users
 * Invalidates: ["organization", "users"]
 */
export const useInviteOrganizationUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.adminInviteOrganizationUsers,
    onSuccess: (data) => {
      toast.success(data.message || "User invited successfully!");
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.users(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to invite user. Please try again.",
      );
    },
  });
};

/**
 * Update organization user
 * Invalidates: ["organization", "users"] and specific user detail
 */
export const useUpdateOrganizationUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) =>
      organizationApi.updateOrganizationUserById(id, data),
    onSuccess: (data, variables) => {
      toast.success(data.message || "User updated successfully!");
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.users(),
      });
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.userDetail(variables.id),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update user. Please try again.",
      );
    },
  });
};

/**
 * Delete organization user
 * Invalidates: ["organization", "users"]
 */
export const useDeleteOrganizationUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.deleteOrganizationUserById,
    onSuccess: (data) => {
      toast.success(data.message || "User deleted successfully!");
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.users(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete user. Please try again.",
      );
    },
  });
};
