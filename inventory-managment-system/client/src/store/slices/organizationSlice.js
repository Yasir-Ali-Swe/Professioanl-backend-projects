// store/slices/organizationSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentOrganization: null,
  settings: null,
  invoiceSettings: null,
  isLoading: false,
  error: null,
};

const organizationSlice = createSlice({
  name: "organization",
  initialState,
  reducers: {
    setOrganization: (state, action) => {
      state.currentOrganization = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setSettings: (state, action) => {
      state.settings = action.payload;
    },
    setInvoiceSettings: (state, action) => {
      state.invoiceSettings = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updateOrganization: (state, action) => {
      state.currentOrganization = {
        ...state.currentOrganization,
        ...action.payload,
      };
    },
    clearOrganization: (state) => {
      state.currentOrganization = null;
      state.settings = null;
      state.invoiceSettings = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setOrganization,
  setSettings,
  setInvoiceSettings,
  setLoading,
  setError,
  updateOrganization,
  clearOrganization,
  clearError,
} = organizationSlice.actions;

// Selectors
export const selectCurrentOrganization = (state) =>
  state.organization.currentOrganization;
export const selectOrganizationSettings = (state) =>
  state.organization.settings;
export const selectInvoiceSettings = (state) =>
  state.organization.invoiceSettings;
export const selectOrganizationLoading = (state) =>
  state.organization.isLoading;
export const selectOrganizationError = (state) => state.organization.error;

export default organizationSlice.reducer;
