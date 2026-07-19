import { useQuery } from "@tanstack/react-query";
import * as dashboardApi from "@/api/dashboard.api";

// ============ QUERY KEYS ============
const DASHBOARD_KEYS = {
  all: ["dashboard"],
  superAdmin: () => [...DASHBOARD_KEYS.all, "superAdmin"],
  admin: () => [...DASHBOARD_KEYS.all, "admin"],
  manager: () => [...DASHBOARD_KEYS.all, "manager"],
  staff: () => [...DASHBOARD_KEYS.all, "staff"],
  salesTrends: (params) => [
    ...DASHBOARD_KEYS.all,
    "salesTrends",
    { ...params },
  ],
  stockLevels: (params) => [
    ...DASHBOARD_KEYS.all,
    "stockLevels",
    { ...params },
  ],
  financial: (params) => [...DASHBOARD_KEYS.all, "financial", { ...params }],
};

// ============ ROLE-SPECIFIC DASHBOARD HOOKS ============

/**
 * Super Admin Dashboard Stats
 * Query Key: ["dashboard", "superAdmin"]
 */
export const useSuperAdminDashboard = (options = {}) => {
  return useQuery({
    queryKey: DASHBOARD_KEYS.superAdmin(),
    queryFn: () => dashboardApi.getSuperAdminDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    ...options,
  });
};

/**
 * Admin Dashboard Stats
 * Query Key: ["dashboard", "admin"]
 */
export const useAdminDashboard = (options = {}) => {
  return useQuery({
    queryKey: DASHBOARD_KEYS.admin(),
    queryFn: () => dashboardApi.getAdminDashboardStats(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    ...options,
  });
};

/**
 * Manager Dashboard Stats
 * Query Key: ["dashboard", "manager"]
 */
export const useManagerDashboard = (options = {}) => {
  return useQuery({
    queryKey: DASHBOARD_KEYS.manager(),
    queryFn: () => dashboardApi.getManagerDashboardStats(),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Staff Dashboard Stats
 * Query Key: ["dashboard", "staff"]
 */
export const useStaffDashboard = (options = {}) => {
  return useQuery({
    queryKey: DASHBOARD_KEYS.staff(),
    queryFn: () => dashboardApi.getStaffDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
    ...options,
  });
};

// ============ REPORT HOOKS ============

/**
 * Sales Trends Report
 * Query Key: ["dashboard", "salesTrends", { params }]
 */
export const useSalesTrends = (params = {}, options = {}) => {
  return useQuery({
    queryKey: DASHBOARD_KEYS.salesTrends(params),
    queryFn: () => dashboardApi.getSalesTrends(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Stock Levels Report
 * Query Key: ["dashboard", "stockLevels", { params }]
 */
export const useStockLevelsReport = (params = {}, options = {}) => {
  return useQuery({
    queryKey: DASHBOARD_KEYS.stockLevels(params),
    queryFn: () => dashboardApi.getStockLevelsReport(params),
    staleTime: 3 * 60 * 1000,
    ...options,
  });
};

/**
 * Financial Report
 * Query Key: ["dashboard", "financial", { params }]
 */
export const useFinancialReport = (params = {}, options = {}) => {
  return useQuery({
    queryKey: DASHBOARD_KEYS.financial(params),
    queryFn: () => dashboardApi.getFinancialReport(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
