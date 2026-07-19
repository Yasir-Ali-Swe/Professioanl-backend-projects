import axiosInstance from "@/lib/axiosInstance";

export const createProduct = (data) => {
  return axiosInstance
    .post("/api/v1/product/create-product", data)
    .then((res) => res.data);
};

export const getAllProducts = (params) => {
  return axiosInstance
    .get("/api/v1/product/get-all-products", { params })
    .then((res) => res.data);
};

export const updateProduct = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/product/update-product/${id}`, data)
    .then((res) => res.data);
};

export const getProductById = (id) => {
  return axiosInstance
    .get(`/api/v1/product/get-product-by-id/${id}`)
    .then((res) => res.data);
};

export const toggleProductActive = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/product/toggle-product-active/${id}`, data)
    .then((res) => res.data);
};

export const uploadProductImage = (id, formData) => {
  return axiosInstance
    .post(`/api/v1/product/upload-product-image/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((res) => res.data);
};
