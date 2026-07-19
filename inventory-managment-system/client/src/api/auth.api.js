import axiosInstance from "@/lib/axiosInstance";

export const registerOrganization = (data) => {
  return axiosInstance
    .post("/api/v1/auth/register-organization", data)
    .then((res) => res.data);
};

export const loginUser = (data) => {
  return axiosInstance.post("/api/v1/auth/login", data).then((res) => res.data);
};

export const logoutUser = () => {
  return axiosInstance.post("/api/v1/auth/logout").then((res) => res.data);
};

export const getLoginUser = () => {
  return axiosInstance
    .get("/api/v1/auth/get-login-user")
    .then((res) => res.data);
};

export const forgetPassword = (data) => {
  return axiosInstance
    .post("/api/v1/auth/forget-password", data)
    .then((res) => res.data);
};

export const resetPassword = (token, data) => {
  return axiosInstance
    .post(`/api/v1/auth/reset-password/${token}`, data)
    .then((res) => res.data);
};

export const refreshAuth = () => {
  return axiosInstance
    .post("/api/v1/auth/refresh-auth")
    .then((res) => res.data);
};

export const verifyEmail = (token) => {
  return axiosInstance
    .post(`/api/v1/auth/verify-email/${token}`)
    .then((res) => res.data);
};
