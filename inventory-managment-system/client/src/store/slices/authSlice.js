import { createSlice } from "@reduxjs/toolkit";

// MOCK USER FOR UI DEVELOPMENT - Remove this when integrating with real API
const MOCK_USER = {
  id: "1",
  name: "John Doe",
  email: "john@stockpilot.com",
  role: "super_admin", // Change to 'super_admin', 'admin', 'manager', or 'staff' to test different roles
  organizationId: "org_123",
  avatar:
    "https://ui-avatars.com/api/?name=John+Doe&background=6B46C1&color=fff&size=128",
};

const initialState = {
  user: MOCK_USER, // Set mock user for UI development
  accessToken: null, // Add accessToken field for JWT
  isAuthenticated: true, // Set to true for UI development
  isLoading: false,
  error: null,
  isVerified: true, // Add verification status
  organization: null, // Add organization details
  subscriptionPlan: null, // Add subscription plan details
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Set complete user data with token
    setCredentials: (state, action) => {
      const { user, accessToken, organization, subscriptionPlan } =
        action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      if (organization) {
        state.organization = organization;
      }
      if (subscriptionPlan) {
        state.subscriptionPlan = subscriptionPlan;
      }
      if (user?.isVerified !== undefined) {
        state.isVerified = user.isVerified;
      }
    },

    // Set only user data (for get-login-user response)
    setUser: (state, action) => {
      const { user, organization, subscriptionPlan } = action.payload;
      state.user = user;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      if (organization) {
        state.organization = organization;
      }
      if (subscriptionPlan) {
        state.subscriptionPlan = subscriptionPlan;
      }
      if (user?.isVerified !== undefined) {
        state.isVerified = user.isVerified;
      }
    },

    // Set only access token (for refresh)
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
    },

    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Logout user - clear all auth data
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.organization = null;
      state.subscriptionPlan = null;
      state.isVerified = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Update specific user fields
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      if (action.payload.isVerified !== undefined) {
        state.isVerified = action.payload.isVerified;
      }
    },

    // Update organization data
    updateOrganization: (state, action) => {
      state.organization = { ...state.organization, ...action.payload };
    },

    // Update subscription plan
    updateSubscriptionPlan: (state, action) => {
      state.subscriptionPlan = action.payload;
    },

    // For testing different roles without logging out
    setMockRole: (state, action) => {
      if (state.user) {
        state.user.role = action.payload;
      }
    },

    // Set verification status
    setVerified: (state, action) => {
      state.isVerified = action.payload;
      if (state.user) {
        state.user.isVerified = action.payload;
      }
    },
  },
});

// Actions
export const {
  setCredentials,
  setUser,
  setAccessToken,
  setLoading,
  setError,
  logout,
  clearError,
  updateUser,
  updateOrganization,
  updateSubscriptionPlan,
  setMockRole,
  setVerified,
} = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectUserRole = (state) => state.auth.user?.role || null;
export const selectOrganizationId = (state) =>
  state.auth.user?.organizationId || state.auth.organization?._id || null;
export const selectOrganization = (state) => state.auth.organization;
export const selectSubscriptionPlan = (state) => state.auth.subscriptionPlan;
export const selectIsVerified = (state) => state.auth.isVerified;
export const selectUserEmail = (state) => state.auth.user?.email || null;
export const selectUserName = (state) => state.auth.user?.name || null;
export const selectUserImage = (state) => state.auth.user?.imageUrl || null;

export default authSlice.reducer;
