import axiosInstance from "@/lib/axiosInstance";

export const getLatestInsight = (params) => {
  return axiosInstance
    .get("/api/v1/ai/insights/summary", { params })
    .then((res) => res.data);
};

export const getInsightsHistory = (params) => {
  return axiosInstance
    .get("/api/v1/ai/insights/history", { params })
    .then((res) => res.data);
};

export const generateInsightNow = (data) => {
  return axiosInstance
    .post("/api/v1/ai/insights/generate", data)
    .then((res) => res.data);
};

export const generateInsightStream = (data) => {
  return axiosInstance
    .post("/api/v1/ai/insights/generate/stream", data, {
      responseType: "stream",
    })
    .then((res) => res.data);
};
