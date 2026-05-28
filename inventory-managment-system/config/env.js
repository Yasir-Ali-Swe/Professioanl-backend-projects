import "dotenv/config";

const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const CLIENT_URL = process.env.CLIENT_URL;
const NODE_ENV = process.env.NODE_ENV;

export {
  PORT,
  MONGODB_URI,
  JWT_SECRET,
  EMAIL_USER,
  EMAIL_PASSWORD,
  CLIENT_URL,
  NODE_ENV,
};
