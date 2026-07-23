// store/rootReducer.js
import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
});
