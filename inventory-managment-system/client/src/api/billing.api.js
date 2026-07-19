import axiosInstance from "@/lib/axiosInstance";

export const createCheckoutSession = () => {
  return axiosInstance
    .post("/api/v1/billing/create-checkout-session")
    .then((res) => res.data);
};

export const getSubscription = () => {
  return axiosInstance
    .get("/api/v1/billing/subscription")
    .then((res) => res.data);
};

export const cancelSubscription = () => {
  return axiosInstance.post("/api/v1/billing/cancel").then((res) => res.data);
};
