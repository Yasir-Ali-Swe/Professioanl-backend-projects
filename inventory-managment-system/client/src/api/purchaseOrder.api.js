import axiosInstance from "@/lib/axiosInstance";

export const createPurchaseOrder = (data) => {
  return axiosInstance
    .post("/api/v1/purchase/create-purchase-order", data)
    .then((res) => res.data);
};

export const getAllPurchaseOrders = (params) => {
  return axiosInstance
    .get("/api/v1/purchase/get-all-purchase-orders", { params })
    .then((res) => res.data);
};

export const getPurchaseOrderById = (id) => {
  return axiosInstance
    .get(`/api/v1/purchase/get-purchase-order-by-id/${id}`)
    .then((res) => res.data);
};

export const approvePurchaseOrder = (id) => {
  return axiosInstance
    .patch(`/api/v1/purchase/approve-purchase-order/${id}`)
    .then((res) => res.data);
};

export const rejectPurchaseOrder = (id) => {
  return axiosInstance
    .patch(`/api/v1/purchase/reject-purchase-order/${id}`)
    .then((res) => res.data);
};

export const fulfillPurchaseOrder = (id) => {
  return axiosInstance
    .patch(`/api/v1/purchase/fulfill-purchase-order/${id}`)
    .then((res) => res.data);
};
