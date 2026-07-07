import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "./env.js";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const createStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    },
  });
};

export const userStorage = createStorage("users");
export const productStorage = createStorage("products");
export const organizationStorage = createStorage("organizations");

export const uploadUser = multer({ storage: userStorage });
export const uploadProduct = multer({ storage: productStorage });
export const uploadOrganization = multer({ storage: organizationStorage });

export default cloudinary;