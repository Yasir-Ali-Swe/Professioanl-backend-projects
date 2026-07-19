import axiosInstance from "@/lib/axiosInstance";

export const createCategory = (data) => {
  return axiosInstance
    .post("/api/v1/category/create-category", data)
    .then((res) => res.data);
};

export const updateCategory = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/category/update-category/${id}`, data)
    .then((res) => res.data);
};

export const getAllCategories = (params) => {
  return axiosInstance
    .get("/api/v1/category/get-all-categories", { params })
    .then((res) => res.data);
};

export const getCategoryById = (id) => {
  return axiosInstance
    .get(`/api/v1/category/get-category-by-id/${id}`)
    .then((res) => res.data);
};

export const getCategoryBySlug = (slug) => {
  return axiosInstance
    .get(`/api/v1/category/get-category-by-slug/${slug}`)
    .then((res) => res.data);
};

export const getCategoryProducts = (id, params) => {
  return axiosInstance
    .get(`/api/v1/category/get-category-products/${id}`, { params })
    .then((res) => res.data);
};

export const deleteCategory = (id) => {
  return axiosInstance
    .delete(`/api/v1/category/delete-category/${id}`)
    .then((res) => res.data);
};
