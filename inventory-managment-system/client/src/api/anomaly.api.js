import axiosInstance from "@/lib/axiosInstance";

export const getAnomalies = (params) => {
  return axiosInstance
    .get("/api/v1/anomaly/anomalies", { params })
    .then((res) => res.data);
};

export const getAnomalyById = (id) => {
  return axiosInstance
    .get(`/api/v1/anomaly/anomalies/${id}`)
    .then((res) => res.data);
};

export const resolveAnomaly = (id, data) => {
  return axiosInstance
    .patch(`/api/v1/anomaly/anomalies/${id}/resolve`, data)
    .then((res) => res.data);
};

export const runAnomalyDetection = () => {
  return axiosInstance
    .post("/api/v1/anomaly/anomalies/run-detection")
    .then((res) => res.data);
};
