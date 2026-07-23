import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as userApi from "../api/users.api";

// ============ QUERY KEYS ============
const USER_KEYS = {
  all: ["user"],
  profile: () => [...USER_KEYS.all, "profile"],
};

// ============ QUERY HOOKS ============

/**
 * Get current user profile
 * Query Key: ["user", "profile"]
 */
export const useUserProfile = (options = {}) => {
  return useQuery({
    queryKey: USER_KEYS.profile(),
    queryFn: () => userApi.getUserProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Upload user profile image
 * Invalidates: ["user", "profile"] and ["auth", "user"] on success
 */
export const useUploadUserProfileImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.uploadUserProfileImage,
    onSuccess: (data) => {
      toast.success(data.message || "Profile image uploaded successfully!");

      queryClient.invalidateQueries({
        queryKey: USER_KEYS.profile(),
      });
      queryClient.invalidateQueries({
        queryKey: ["auth", "user"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Failed to upload profile image. Please try again.",
      );
    },
  });
};

/**
 * Update user profile
 * Invalidates: ["user", "profile"] and ["auth", "user"] on success
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.updateUserProfile,
    onSuccess: (data) => {
      toast.success(data.message || "Profile updated successfully!");

      queryClient.invalidateQueries({
        queryKey: USER_KEYS.profile(),
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
