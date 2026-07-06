import { APP_NAME } from "../config/env.js";
const resetPasswordEmailTemplate = (userName, resetPasswordLink) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Your Password</title>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  background: #f5f5f5;
  padding: 20px;
}

.email-container {
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.header {
  background: #ea580c;
  color: #fff;
  text-align: center;
  padding: 40px 20px;
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
  margin-bottom: 24px;
  color: #333;
}

.info-text {
  margin-bottom: 24px;
  font-size: 14px;
  line-height: 1.7;
  color: #666;
}

.alert-box {
  margin-bottom: 24px;
  padding: 14px;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
}

.alert-box p {
  font-size: 13px;
  color: #991b1b;
}

.button-wrapper {
  margin: 32px 0;
  text-align: center;
}

.cta-button {
  display: inline-block;
  padding: 14px 36px;
  background: #ea580c;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
}

.expiry-warning {
  margin: 24px 0;
  padding: 14px;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.expiry-warning p {
  font-size: 13px;
  color: #92400e;
}

.security-note {
  margin-top: 24px;
  padding: 14px;
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.security-note p {
  font-size: 13px;
  color: #1e3a8a;
}

.footer {
  padding: 24px;
  text-align: center;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.footer p {
  font-size: 12px;
  color: #888;
}
</style>
</head>

<body>

<div class="email-container">

  <div class="header">
    <h1>${APP_NAME}</h1>
    <p>Reset your account password</p>
  </div>

  <div class="content">

    <p class="greeting">
      Hello <strong>${userName}</strong>,
    </p>

    <div class="alert-box">
      <p>
        We received a request to reset the password for your PrimeStock account.
      </p>
    </div>

    <p class="info-text">
      Click the button below to create a new password. If you didn't request a password reset, you can safely ignore this email.
    </p>

    <div class="button-wrapper">
      <a href="${resetPasswordLink}" class="cta-button">
        Reset Password
      </a>
    </div>

    <div class="expiry-warning">
      <p><strong>⏱️ This password reset link expires in 15 minutes.</strong></p>
    </div>

    <div class="security-note">
      <p>
        🔒 We'll never ask for your password by email. If you didn't request this reset, your account is still secure and no further action is required.
      </p>
    </div>

  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} PrimeStock. All rights reserved.</p>
  </div>

</div>

</body>
</html>
  `;
};

export default resetPasswordEmailTemplate;
