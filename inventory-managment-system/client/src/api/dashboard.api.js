import axiosInstance from "@/lib/axiosInstance";

// ============ ROLE-SPECIFIC DASHBOARDS ============
export const getSuperAdminDashboardStats = () => {
  return axiosInstance
    .get("/api/v1/dashboard/super-admin-dashboard-stats")
    .then((res) => res.data);
};

export const getAdminDashboardStats = () => {
  return axiosInstance
    .get("/api/v1/dashboard/admin-dashboard-stats")
    .then((res) => res.data);
};

export const getManagerDashboardStats = () => {
  return axiosInstance
    .get("/api/v1/dashboard/manager-dashboard-stats")
    .then((res) => res.data);
};

export const getStaffDashboardStats = () => {
  return axiosInstance
    .get("/api/v1/dashboard/staff-dashboard-stats")
    .then((res) => res.data);
};

// ============ REPORTS ============
export const getSalesTrends = (params) => {
  return axiosInstance
    .get("/api/v1/dashboard/sales-trends", { params })
    .then((res) => res.data);
};

export const getStockLevelsReport = (params) => {
  return axiosInstance
    .get("/api/v1/dashboard/stock-levels-report", { params })
    .then((res) => res.data);
};

export const getFinancialReport = (params) => {
  return axiosInstance
    .get("/api/v1/dashboard/financial-report", { params })
    .then((res) => res.data);
};
