import axiosInstance from "@/lib/axiosInstance";

export const uploadUserProfileImage = (formData) => {
  return axiosInstance
    .post("/api/v1/user/upload-profile-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((res) => res.data);
};

export const getUserProfile = () => {
  return axiosInstance.get("/api/v1/user/profile").then((res) => res.data);
};

export const updateUserProfile = (data) => {
  return axiosInstance
    .patch("/api/v1/user/profile", data)
    .then((res) => res.data);
};
