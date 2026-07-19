import axiosInstance from "@/lib/axiosInstance";

export const chatWithAI = (data) => {
  return axiosInstance.post("/api/v1/ai/chat", data).then((res) => res.data);
};

export const getChatHistory = (params) => {
  return axiosInstance
    .get("/api/v1/ai/chat/history", { params })
    .then((res) => res.data);
};

export const clearContext = () => {
  return axiosInstance
    .delete("/api/v1/ai/chat/context")
    .then((res) => res.data);
};

export const getChatAnalytics = () => {
  return axiosInstance.get("/api/v1/ai/chat/analytics").then((res) => res.data);
};
