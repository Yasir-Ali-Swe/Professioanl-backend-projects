import { APP_NAME } from "../config/env.js";
const accountCreatedEmailTemplate = (userName, email, password, loginUrl) => {
  return `

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Account Created Successfully</title>

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  opacity: 0.9;
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

.credentials-box {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  padding: 20px;
  margin: 24px 0;
}

.credential-item {
  margin-bottom: 16px;
}

.credential-item:last-child {
  margin-bottom: 0;
}

.credential-label {
  font-size: 12px;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  display: block;
}

.credential-value {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
  font-family: 'Courier New', monospace;
  word-break: break-all;
  background: #ffffff;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
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
  transition: background-color 0.2s;
}

.cta-button:hover {
  background: #5568d3;
}

.security-note {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 14px;
  margin: 24px 0;
}

.security-note p {
  font-size: 13px;
  color: #1e3a8a;
  margin: 0;
}

.next-steps {
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
  padding: 14px;
  margin: 24px 0;
}

.next-steps p {
  font-size: 13px;
  color: #166534;
  margin: 0;
  line-height: 1.6;
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
  margin: 4px 0;
}
</style>
</head>

<body>

<div class="email-container">

  <div class="header">
    <h1>${APP_NAME}</h1>
    <p>Your account has been created successfully</p>
  </div>

  <div class="content">

    <p class="greeting">
      Hello <strong>${userName}</strong>,
    </p>

    <p class="info-text">
      Congratulations! Your account has been created successfully. You can now log in and start using our platform.
    </p>

    <div class="credentials-box">
      <div class="credential-item">
        <span class="credential-label">Email Address</span>
        <div class="credential-value">${email}</div>
      </div>
      <div class="credential-item">
        <span class="credential-label">Password</span>
        <div class="credential-value">${password}</div>
      </div>
    </div>

    <div class="button-wrapper">
      <a href="${loginUrl}" class="cta-button">
        Log In to Your Account
      </a>
    </div>

    <div class="security-note">
      <p><strong>🔒 Security Reminder:</strong> Keep your password safe and never share it with anyone. We'll never ask for your password by email.</p>
    </div>

    <div class="next-steps">
      <p><strong>📋 Next Steps:</strong><br>1. Log in to your account using the credentials above<br>2. Update your credentials(email,password)<br>3. Start exploring our features</p>
    </div>

    <p class="info-text">
      If you have any questions or need help, feel free to contact our support team.
    </p>

  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
    <p>This is an automated message, please do not reply to this email.</p>
  </div>

</div>

</body>
</html>
`;
};

export default accountCreatedEmailTemplate;
