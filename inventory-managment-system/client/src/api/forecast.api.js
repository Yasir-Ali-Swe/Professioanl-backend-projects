import axiosInstance from "@/lib/axiosInstance";

export const getForecastForProduct = (id) => {
  return axiosInstance
    .get(`/api/v1/forecast/forecast/${id}`)
    .then((res) => res.data);
};

export const getAllForecasts = (params) => {
  return axiosInstance
    .get("/api/v1/forecast/forecasts", { params })
    .then((res) => res.data);
};

export const getReorderSuggestions = (params) => {
  return axiosInstance
    .get("/api/v1/forecast/reorder-suggestions", { params })
    .then((res) => res.data);
};

export const generateReorderSuggestion = (id) => {
  return axiosInstance
    .post(`/api/v1/forecast/reorder-suggestions/generate/${id}`)
    .then((res) => res.data);
};

export const approveReorderSuggestion = (id) => {
  return axiosInstance
    .patch(`/api/v1/forecast/reorder-suggestions/${id}/approve`)
    .then((res) => res.data);
};

export const dismissReorderSuggestion = (id) => {
  return axiosInstance
    .patch(`/api/v1/forecast/reorder-suggestions/${id}/dismiss`)
    .then((res) => res.data);
};
