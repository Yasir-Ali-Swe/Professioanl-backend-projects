import axiosInstance from "@/lib/axiosInstance";

export const createInvoice = (data) => {
  return axiosInstance
    .post("/api/v1/invoice/create-invoice", data)
    .then((res) => res.data);
};

export const getAllInvoices = (params) => {
  return axiosInstance
    .get("/api/v1/invoice/get-all-invoices", { params })
    .then((res) => res.data);
};

export const getMyInvoices = (params) => {
  return axiosInstance
    .get("/api/v1/invoice/get-my-invoices", { params })
    .then((res) => res.data);
};

export const getInvoiceById = (id) => {
  return axiosInstance
    .get(`/api/v1/invoice/get-invoice-by-id/${id}`)
    .then((res) => res.data);
};

export const voidInvoice = (id) => {
  return axiosInstance
    .patch(`/api/v1/invoice/void-invoice/${id}`)
    .then((res) => res.data);
};
