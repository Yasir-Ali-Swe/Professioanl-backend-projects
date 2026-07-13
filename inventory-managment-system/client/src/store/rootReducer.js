// store/rootReducer.js
import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import organizationReducer from "./slices/organizationSlice";
import productReducer from "./slices/productSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  organization: organizationReducer,
  product: productReducer,
  // Add more reducers as needed
});
