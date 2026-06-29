import nodeMailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASSWORD, CLIENT_URL } from "../config/env.js";
import resetPasswordEmailTemplate  from "../templates/reset.password.email.template.js";
import  verifyEmailTemplate  from "../templates/verification.email.template.js";

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

export const sendVerificationEmail = async (userName, token, email) => {
  const url = `${CLIENT_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Verify Your Email",
    html: verifyEmailTemplate(userName, url)
  });
};

export const sendResetPasswordEmail = async (userName, token, email) => {
  const url = `${CLIENT_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Reset Your Password",
    html: resetPasswordEmailTemplate(userName, url)
  });
};