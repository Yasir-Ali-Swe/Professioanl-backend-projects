import axios from "axios";
import store from "@/store"; // Adjust path to your store
import { setAccessToken, logout, setError } from "@/store/slices/authSlice";

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
  },
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
          },
        );

        const { accessToken } = response.data;

        // Update Redux store with new access token
        if (accessToken) {
          store.dispatch(setAccessToken(accessToken));
        }

        // Process queued requests
        processQueue(null, accessToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        processQueue(refreshError, null);
        store.dispatch(logout());
        store.dispatch(setError("Session expired. Please login again."));

        // Optionally redirect to login
        // window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      // Forbidden - maybe user doesn't have permission
      store.dispatch(
        setError("You don't have permission to perform this action."),
      );
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
