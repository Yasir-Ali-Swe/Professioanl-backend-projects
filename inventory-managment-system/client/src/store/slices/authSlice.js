// store/slices/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

// MOCK USER FOR UI DEVELOPMENT - Remove this when integrating with real API
const MOCK_USER = {
  id: "1",
  name: "John Doe",
  email: "john@stockpilot.com",
  role: "staff", // Change to 'super_admin', 'admin', 'manager', or 'staff' to test different roles
  organizationId: "org_123",
  avatar:
    "https://ui-avatars.com/api/?name=John+Doe&background=6B46C1&color=fff&size=128",
};

const initialState = {
  user: MOCK_USER, // Set mock user for UI development
  isAuthenticated: true, // Set to true for UI development
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    // For testing different roles without logging out
    setMockRole: (state, action) => {
      if (state.user) {
        state.user.role = action.payload;
      }
    },
  },
});

export const {
  setUser,
  setLoading,
  setError,
  logout,
  clearError,
  updateUser,
  setMockRole,
} = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectUserRole = (state) => state.auth.user?.role || null;
export const selectOrganizationId = (state) =>
  state.auth.user?.organizationId || null;

export default authSlice.reducer;
