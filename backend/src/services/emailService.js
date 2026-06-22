const nodemailer = require('nodemailer');
const envConfig = require('../config/env');

/**
 * Create a nodemailer transporter.
 * Supports Gmail OAuth2 (production) and SMTP (dev/test via Ethereal or custom SMTP).
 */
const createTransporter = () => {
  if (envConfig.SMTP_HOST) {
    // Custom SMTP (e.g. Mailtrap, Brevo, etc.)
    return nodemailer.createTransport({
      host: envConfig.SMTP_HOST,
      port: parseInt(envConfig.SMTP_PORT) || 587,
      secure: envConfig.SMTP_SECURE === 'true',
      auth: {
        user: envConfig.SMTP_USER,
        pass: envConfig.SMTP_PASS,
      },
    });
  }

  // Fallback: Gmail with App Password
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: envConfig.EMAIL_FROM,
      pass: envConfig.EMAIL_PASS,
    },
  });
};

/**
 * Send a password reset email.
 * @param {string} to - Recipient email address
 * @param {string} resetUrl - Full reset URL (frontend URL + token)
 * @param {string} userName - Recipient display name
 */
const sendPasswordResetEmail = async (to, resetUrl, userName = 'User') => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SciTrend" <${envConfig.EMAIL_FROM}>`,
    to,
    subject: 'Reset Your SciTrend Password',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #e5e7eb; }
    .container { max-width: 520px; margin: 48px auto; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px; overflow: hidden; }
    .header { padding: 32px 40px 24px; background: linear-gradient(135deg, #1a1a1a 0%, #0f1a2e 100%); border-bottom: 1px solid #2a2a2a; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .logo-icon { width: 32px; height: 32px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .logo-text { font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #818cf8, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h1 { font-size: 22px; font-weight: 700; margin: 0; color: #f9fafb; }
    .body { padding: 32px 40px; }
    p { font-size: 14px; line-height: 1.7; color: #9ca3af; margin: 0 0 16px; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff !important; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 600; margin: 8px 0 24px; }
    .token-box { background: #111; border: 1px solid #333; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #6b7280; word-break: break-all; margin-bottom: 20px; }
    .footer { padding: 20px 40px; border-top: 1px solid #2a2a2a; text-align: center; font-size: 11px; color: #4b5563; }
    .warning { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #f87171; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <span class="logo-text">SciTrend</span>
      </div>
      <h1>Reset your password</h1>
    </div>

    <div class="body">
      <p>Hi <strong style="color:#e5e7eb">${userName}</strong>,</p>
      <p>We received a request to reset the password for your SciTrend account. Click the button below to choose a new password:</p>

      <a href="${resetUrl}" class="btn">Reset Password</a>

      <div class="warning">⏱ This link will expire in <strong>1 hour</strong>.</div>

      <p>If you can't click the button, copy and paste this link into your browser:</p>
      <div class="token-box">${resetUrl}</div>

      <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} SciTrend · Scientific Journal Publication Trend Tracking System</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName},\n\nYou requested a password reset for your SciTrend account.\n\nClick this link to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\n— SciTrend Team`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[email] Password reset sent to ${to} — ${info.messageId}`);
  return info;
};

module.exports = { sendPasswordResetEmail };
