// axiosInstance.js - Interceptor for JWT token refresh
import axios from "axios";
import store from "@/store"; // Adjust path to your store
import { setAccessToken, logout, setError } from "@/store/slices/authSlice";
import { toast } from "sonner";

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies (refresh token)
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - Add JWT token from Redux store to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const accessToken = state.auth.accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 (Unauthorized) and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if it's a refresh request itself to prevent infinite loop
      if (originalRequest.url?.includes("/refresh-auth")) {
        // Refresh failed - logout user
        store.dispatch(logout());
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // CRITICAL FIX: Set _retry flag on queued requests too
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token (cookie will be sent automatically)
        const response = await axios.post(
          "http://localhost:5000/api/v1/auth/refresh-auth",
          {},
          {
            withCredentials: true,
          }
        );

        const { accessToken } = response.data;
        console.log("Token refreshed successfully:", accessToken);

        if (accessToken) {
          store.dispatch(setAccessToken(accessToken));
        }

        // Process queued requests with the new token
        processQueue(null, accessToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        processQueue(refreshError, null);
        store.dispatch(logout());
        store.dispatch(setError("Session expired. Please login again."));

        // Only redirect if not already on login page
        if (window.location.pathname !== "/login") {
          toast.error("Session expired. Please login again.");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      // Forbidden - maybe user doesn't have permission
      store.dispatch(
        setError("You don't have permission to perform this action.")
      );
      toast.error("You don't have permission to perform this action.");
    }

    // Handle network errors
    if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
      toast.error("Network error. Please check your connection.");
    }

    // Handle 500 errors
    if (error.response?.status === 500) {
      toast.error("Server error. Please try again later.");
    }

    return Promise.reject(error);
  }
);

// Utility function to clear all auth data (useful for logout)
export const clearAuthData = () => {
  store.dispatch(logout());
  // Clear any pending requests
  failedQueue = [];
  isRefreshing = false;
};

// Utility function to check if user is authenticated
export const isAuthenticated = () => {
  const state = store.getState();
  return !!state.auth.accessToken;
};

export default axiosInstance;