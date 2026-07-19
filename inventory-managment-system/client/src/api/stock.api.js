import axiosInstance from "@/lib/axiosInstance";

export const stockIn = (data) => {
  return axiosInstance
    .post("/api/v1/stock/stock-in", data)
    .then((res) => res.data);
};

export const stockOut = (data) => {
  return axiosInstance
    .post("/api/v1/stock/stock-out", data)
    .then((res) => res.data);
};

export const getStockHistory = (productId, params) => {
  return axiosInstance
    .get(`/api/v1/stock/stock-history/${productId}`, { params })
    .then((res) => res.data);
};

export const getLowStockProducts = (params) => {
  return axiosInstance
    .get("/api/v1/stock/low-stock", { params })
    .then((res) => res.data);
};

export const getStockSummary = () => {
  return axiosInstance.get("/api/v1/stock/summary").then((res) => res.data);
};

export const getAllStock = (params) => {
  return axiosInstance
    .get("/api/v1/stock/all", { params })
    .then((res) => res.data);
};

export const getProductStockDetails = (productId) => {
  return axiosInstance
    .get(`/api/v1/stock/product/${productId}`)
    .then((res) => res.data);
};
