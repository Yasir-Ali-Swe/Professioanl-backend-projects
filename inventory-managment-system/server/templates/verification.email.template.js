import { APP_NAME } from "../config/env.js";
const verificationEmailTemplate = (userName, verificationLink) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify Your Email</title>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  background-color: #f5f5f5;
  padding: 20px;
}

.email-container {
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

.header {
  background: #667eea;
  padding: 40px 20px;
  text-align: center;
  color: #ffffff;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.header p {
  font-size: 14px;
}

.content {
  padding: 40px 30px;
}

.greeting {
  font-size: 16px;
  color: #333333;
  margin-bottom: 24px;
}

.info-text {
  font-size: 14px;
  color: #666666;
  line-height: 1.7;
  margin-bottom: 24px;
}

.button-wrapper {
  text-align: center;
  margin: 32px 0;
}

.cta-button {
  display: inline-block;
  background: #667eea;
  color: #ffffff !important;
  text-decoration: none;
  padding: 14px 36px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
}

.expiry-warning {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 14px;
  margin: 24px 0;
}

.expiry-warning p {
  font-size: 13px;
  color: #92400e;
}

.security-note {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 14px;
  margin-top: 24px;
}

.security-note p {
  font-size: 13px;
  color: #1e3a8a;
}

.footer {
  background: #f9fafb;
  text-align: center;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
}

.footer p {
  font-size: 12px;
  color: #888888;
}
</style>
</head>

<body>

<div class="email-container">

  <div class="header">
    <h1>${APP_NAME}</h1>
    <p>Complete your registration to get started</p>
  </div>

  <div class="content">

    <p class="greeting">
      Hello <strong>${userName}</strong>,
    </p>

    <p class="info-text">
      Thank you for signing up! Please verify your email address by clicking the button below.
    </p>

    <div class="button-wrapper">
      <a href="${verificationLink}" class="cta-button">
        Verify Email Address
      </a>
    </div>

    <div class="expiry-warning">
      <p><strong>⏱️ This verification link expires in 15 minutes.</strong></p>
    </div>

    <p class="info-text">
      If you didn't create an account, you can safely ignore this email.
    </p>

    <div class="security-note">
      <p>🔒 We'll never ask for your password by email.</p>
    </div>

  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
  </div>

</div>

</body>
</html>
`;
};

export default verificationEmailTemplate;
