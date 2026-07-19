import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import * as authApi from "@/api/auth.api";
import {
  setCredentials,
  setAccessToken,
  setUser,
  logout,
  setVerified,
  updateUser,
  updateOrganization,
  updateSubscriptionPlan,
} from "@/store/slices/authSlice";

// ============ QUERY HOOKS ============

/**
 * Get current logged-in user
 * Query Key: ["auth", "user"]
 * Updates Redux store with user data on success
 */
export const useLoginUser = (options = {}) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const response = await authApi.getLoginUser();

      // Update Redux store with user data
      if (response.success && response.loginUser) {
        const { loginUser } = response;
        dispatch(
          setUser({
            user: loginUser,
            organization: loginUser.organization,
            subscriptionPlan: loginUser.organization?.subscriptionPlan,
          }),
        );
      }

      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Register a new organization
 * Invalidates: ["auth", "user"] on success
 */
export const useRegisterOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.registerOrganization,
    onSuccess: (data) => {
      toast.success(
        data.message || "Registration successful! Please verify your email.",
      );
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    },
  });
};

/**
 * Login user
 * Stores access token and user data in Redux
 * Invalidates: ["auth", "user"] on success
 */
export const useLoginUserMutation = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.loginUser,
    onSuccess: (data) => {
      const { accessToken, loginUser } = data;

      // Store access token and user in Redux
      if (accessToken) {
        dispatch(
          setCredentials({
            user: loginUser,
            accessToken: accessToken,
            organization: loginUser?.organization,
            subscriptionPlan: loginUser?.organization?.subscriptionPlan,
          }),
        );
      }

      toast.success(data.message || "Login successful!");
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    },
  });
};

/**
 * Logout user
 * Clears Redux state and all cached queries
 */
export const useLogoutUser = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logoutUser,
    onSuccess: (data) => {
      toast.success(data.message || "Logged out successfully.");

      // Clear Redux auth state
      dispatch(logout());

      // Clear all cached queries
      queryClient.clear();
    },
    onError: (error) => {
      // Even if API fails, clear local state
      dispatch(logout());
      queryClient.clear();
      toast.error(
        error.response?.data?.message || "Logout failed. Please try again.",
      );
    },
  });
};

/**
 * Request password reset email
 */
export const useForgetPassword = () => {
  return useMutation({
    mutationFn: authApi.forgetPassword,
    onSuccess: (data) => {
      toast.success(
        data.message || "Password reset email sent. Please check your inbox.",
      );
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to send reset email. Please try again.",
      );
    },
  });
};

/**
 * Reset password with token
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }) =>
      authApi.resetPassword(token, { newPassword }),
    onSuccess: (data) => {
      toast.success(
        data.message ||
          "Password reset successful! Please login with your new password.",
      );
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Password reset failed. Please try again.",
      );
    },
  });
};

/**
 * Refresh authentication token
 * Updates access token in Redux
 */
export const useRefreshAuth = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.refreshAuth,
    onSuccess: (data) => {
      const { accessToken } = data;

      // Update access token in Redux
      if (accessToken) {
        dispatch(setAccessToken(accessToken));
      }

      toast.success(data.message || "Token refreshed successfully.");
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Token refresh failed. Please login again.",
      );
      dispatch(logout());
    },
  });
};

/**
 * Verify email with token
 * Invalidates: ["auth", "user"] on success
 */
export const useVerifyEmail = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (data) => {
      toast.success(
        data.message || "Email verified successfully! You can now login.",
      );
      dispatch(setVerified(true));
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Email verification failed. Please try again.",
      );
    },
  });
};

/**
 * Update user profile (when you have this endpoint)
 */
export const useUpdateUser = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => authApi.updateUser(data), // You'll need to create this API function
    onSuccess: (data) => {
      if (data.user) {
        dispatch(updateUser(data.user));
      }
      toast.success(data.message || "Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    },
  });
};
