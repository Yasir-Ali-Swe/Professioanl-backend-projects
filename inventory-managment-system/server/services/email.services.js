import nodeMailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASSWORD, CLIENT_URL } from "../config/env.js";
import forgetPasswordEmailTemplate from "../templates/password.reset.email.template.js";
import verifyEmailTemplate from "../templates/verification.email.template.js";
import accountCreatedEmailTemplate from "../templates/account.created.email.template.js";
import { APP_NAME } from "../config/env.js";

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
    subject: `${APP_NAME} Verify Your Email`,
    html: verifyEmailTemplate(userName, url),
  });
};

export const sendForgetPasswordEmail = async (userName, token, email) => {
  const url = `${CLIENT_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: `${APP_NAME} Password Reset Request`,
    html: forgetPasswordEmailTemplate(userName, url),
  });
};

export const sendAccountCreatedEmail = async (userName, email, password) => {
  const url = `${CLIENT_URL}/login`;
  return sendEmail({
    to: email,
    subject: `${APP_NAME} Account Created Successfully.`,
    html: accountCreatedEmailTemplate(userName, email, password, url),
  });
};
