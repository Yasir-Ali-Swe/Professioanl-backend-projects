import axiosInstance from "@/lib/axiosInstance";

export const createSupplier = (data) => {
  return axiosInstance
    .post("/api/v1/supplier/create-supplier", data)
    .then((res) => res.data);
};

export const getAllSuppliers = (params) => {
  return axiosInstance
    .get("/api/v1/supplier/get-all-suppliers", { params })
    .then((res) => res.data);
};

export const getSupplierByIdWithProducts = (id) => {
  return axiosInstance
    .get(`/api/v1/supplier/get-supplier-with-products/${id}`)
    .then((res) => res.data);
};

export const deleteSupplier = (id) => {
  return axiosInstance
    .delete(`/api/v1/supplier/delete-supplier/${id}`)
    .then((res) => res.data);
};
    
export const updateSupplier = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/supplier/update-supplier/${id}`, data)
    .then((res) => res.data);
};
