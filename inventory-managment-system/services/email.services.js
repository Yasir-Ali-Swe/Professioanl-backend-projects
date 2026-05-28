import nodeMailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASSWORD, CLIENT_URL } from "../config/env.js";

const transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (user, token) => {
  const url = `${CLIENT_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    html: `
      <h2>Verify your email</h2>
      <p>Click below to verify your account:</p>
      <a href="${url}">Verify Email</a>
    `,
  });
};

export const sendPasswordResetEmail = async (user, token) => {
  const url = `${CLIENT_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: "Reset Your Password",
    html: `
      <h2>Reset Your Password</h2>
      <p>Click below to reset your password:</p>
      <a href="${url}">Reset Password</a>
    `,
  });
};
