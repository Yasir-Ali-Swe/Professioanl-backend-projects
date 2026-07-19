import axiosInstance from "@/lib/axiosInstance";

// ============ ORGANIZATION PROFILE ============
export const getOrganizationProfile = () => {
  return axiosInstance
    .get("/api/v1/organization/organization-profile")
    .then((res) => res.data);
};

export const updateOrganizationProfile = (data) => {
  return axiosInstance
    .patch("/api/v1/organization/organization-profile", data)
    .then((res) => res.data);
};

export const uploadOrganizationLogo = (formData) => {
  return axiosInstance
    .post("/api/v1/organization/organization-logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((res) => res.data);
};

// ============ ADMIN PROFILE ============
export const getOrganizationAdminProfile = () => {
  return axiosInstance
    .get("/api/v1/organization/organization-admin-profile")
    .then((res) => res.data);
};

export const updateOrganizationAdminProfile = (data) => {
  return axiosInstance
    .patch("/api/v1/organization/organization-admin-profile", data)
    .then((res) => res.data);
};

// ============ INVOICE SETTINGS ============
export const getOrganizationInvoiceDetails = () => {
  return axiosInstance
    .get("/api/v1/organization/organization-invoice-details")
    .then((res) => res.data);
};

export const updateOrganizationInvoiceDetails = (data) => {
  return axiosInstance
    .patch("/api/v1/organization/organization-invoice-details", data)
    .then((res) => res.data);
};

// ============ USER MANAGEMENT ============
export const adminInviteOrganizationUsers = (data) => {
  return axiosInstance
    .post("/api/v1/organization/organization-users/invite", data)
    .then((res) => res.data);
};

export const getOrganizationUsers = (params) => {
  return axiosInstance
    .get("/api/v1/organization/organization-users", { params })
    .then((res) => res.data);
};

export const getOrganizationUserById = (id) => {
  return axiosInstance
    .get(`/api/v1/organization/organization-users/${id}`)
    .then((res) => res.data);
};

export const updateOrganizationUserById = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/organization/organization-users/${id}`, data)
    .then((res) => res.data);
};

export const deleteOrganizationUserById = (id) => {
  return axiosInstance
    .delete(`/api/v1/organization/organization-users/${id}`)
    .then((res) => res.data);
};

// ============ DASHBOARD STATS ============
export const getDashboardStats = () => {
  return axiosInstance
    .get("/api/v1/organization/organization-dashboard-stats")
    .then((res) => res.data);
};
