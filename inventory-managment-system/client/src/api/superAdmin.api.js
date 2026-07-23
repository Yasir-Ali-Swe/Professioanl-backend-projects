import axiosInstance from "@/lib/axiosInstance";

export const getAllOrganizations = (params) => {
  return axiosInstance
    .get("/api/v1/super-admin/organizations", { params })
    .then((res) => res.data);
};

export const getOrganizationById = (id) => {
  return axiosInstance
    .get(`/api/v1/super-admin/organization/${id}`)
    .then((res) => res.data);
};

export const deleteOrganization = (id) => {
  return axiosInstance
    .delete(`/api/v1/super-admin/organization/${id}`)
    .then((res) => res.data);
};

export const getPlatformAnalytics = () => {
  return axiosInstance
    .get("/api/v1/super-admin/platform-analytics")
    .then((res) => res.data);
};

export const getAllOrganizationSubscriptions = (params) => {
  return axiosInstance
    .get("/api/v1/super-admin/organizations/subscriptions", { params })
    .then((res) => res.data);
};

export const getOrganizationSubscriptionDetails = (id) => {
  return axiosInstance
    .get(`/api/v1/super-admin/organizations/${id}/subscription`)
    .then((res) => res.data);
};

export const updateOrganizationSubscriptionPlan = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/super-admin/organizations/${id}/subscription`, data)
    .then((res) => res.data);
};

export const updateOrganizationStatus = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/super-admin/organization/${id}/status`, data)
    .then((res) => res.data);
};

export const getPlatformDashboardStats = () => {
  return axiosInstance
    .get("/api/v1/super-admin/platform-dashboard-stats")
    .then((res) => res.data);
};
