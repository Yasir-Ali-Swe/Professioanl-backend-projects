// store/slices/productSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  products: [],
  selectedProduct: null,
  total: 0,
  isLoading: false,
  error: null,
  filters: {
    search: "",
    category: "",
    supplier: "",
    minStock: "",
    maxStock: "",
  },
  pagination: {
    page: 1,
    limit: 10,
  },
};

const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts: (state, action) => {
      state.products = action.payload.products || [];
      state.total = action.payload.total || 0;
      state.isLoading = false;
      state.error = null;
    },
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
    },
    addProduct: (state, action) => {
      state.products.unshift(action.payload);
      state.total += 1;
    },
    updateProduct: (state, action) => {
      const index = state.products.findIndex(
        (p) => p._id === action.payload._id,
      );
      if (index !== -1) {
        state.products[index] = action.payload;
      }
      if (state.selectedProduct?._id === action.payload._id) {
        state.selectedProduct = action.payload;
      }
    },
    removeProduct: (state, action) => {
      state.products = state.products.filter((p) => p._id !== action.payload);
      state.total -= 1;
      if (state.selectedProduct?._id === action.payload) {
        state.selectedProduct = null;
      }
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetProducts: (state) => {
      state.products = [];
      state.selectedProduct = null;
      state.total = 0;
      state.isLoading = false;
      state.error = null;
      state.pagination = { page: 1, limit: 10 };
    },
  },
});

export const {
  setProducts,
  setSelectedProduct,
  addProduct,
  updateProduct,
  removeProduct,
  setFilters,
  setPagination,
  setLoading,
  setError,
  clearSelectedProduct,
  clearError,
  resetProducts,
} = productSlice.actions;

// Selectors
export const selectProducts = (state) => state.product.products;
export const selectSelectedProduct = (state) => state.product.selectedProduct;
export const selectProductTotal = (state) => state.product.total;
export const selectProductFilters = (state) => state.product.filters;
export const selectProductPagination = (state) => state.product.pagination;
export const selectProductLoading = (state) => state.product.isLoading;
export const selectProductError = (state) => state.product.error;

export default productSlice.reducer;
