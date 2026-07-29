import "dotenv/config";

const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const CLIENT_URL = process.env.CLIENT_URL;
const NODE_ENV = process.env.NODE_ENV;
const APP_NAME = process.env.APP_NAME;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "GEMINI_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log("✅ Environment variables validated successfully");

export {
  PORT,
  MONGODB_URI,
  JWT_SECRET,
  EMAIL_USER,
  EMAIL_PASSWORD,
  CLIENT_URL,
  NODE_ENV,
  APP_NAME,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  GEMINI_API_KEY,
  STRIPE_SECRET_KEY,
  GEMINI_MODEL,
  STRIPE_WEBHOOK_SECRET,
};
