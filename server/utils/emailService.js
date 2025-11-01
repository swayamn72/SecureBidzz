import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send MFA verification code
export const sendMFACode = async (email, code) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"SecureBidz Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your MFA Verification Code - SecureBidz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🔐 MFA Verification Code</h2>
          <p>Hello,</p>
          <p>Your Multi-Factor Authentication code for SecureBidz is:</p>
          <div style="background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email or contact our security team immediately.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from SecureBidz. Please do not reply to this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('MFA code sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending MFA code:', error);
    return { success: false, error: error.message };
  }
};

// Send account lockout notification
export const sendAccountLockoutNotification = async (email, unlockTime) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"SecureBidz Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Account Security Alert - SecureBidz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">🚨 Account Security Alert</h2>
          <p>Hello,</p>
          <p>Your SecureBidz account has been temporarily locked due to multiple failed login attempts.</p>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Lockout Details:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>Reason: Multiple failed login attempts</li>
              <li>Locked until: ${unlockTime.toLocaleString()}</li>
              <li>Duration: 2 hours</li>
            </ul>
          </div>
          <p>If this wasn't you, please contact our security team immediately.</p>
          <p>If you remember your password, you can try logging in again after the lockout period expires.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated security notification from SecureBidz.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Lockout notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending lockout notification:', error);
    return { success: false, error: error.message };
  }
};

// Send password change notification
export const sendPasswordChangeNotification = async (email, changeTime) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"SecureBidz Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Changed - SecureBidz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">🔑 Password Changed Successfully</h2>
          <p>Hello,</p>
          <p>Your SecureBidz password has been changed successfully.</p>
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Change Details:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>Time: ${changeTime.toLocaleString()}</li>
              <li>IP: ${process.env.REQUEST_IP || 'Unknown'}</li>
            </ul>
          </div>
          <p>If you didn't make this change, please contact our security team immediately and change your password.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated security notification from SecureBidz.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password change notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password change notification:', error);
    return { success: false, error: error.message };
  }
};

// Send suspicious activity alert
export const sendSuspiciousActivityAlert = async (email, activity) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"SecureBidz Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Suspicious Activity Detected - SecureBidz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ffc107;">⚠️ Suspicious Activity Alert</h2>
          <p>Hello,</p>
          <p>We detected unusual activity on your SecureBidz account:</p>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Activity Details:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>Type: ${activity.type}</li>
              <li>Time: ${activity.timestamp.toLocaleString()}</li>
              <li>IP: ${activity.ip}</li>
              <li>Location: ${activity.location || 'Unknown'}</li>
            </ul>
          </div>
          <p>If this was you, no action is needed. If this wasn't you, please:</p>
          <ol style="margin: 10px 0 0 20px;">
            <li>Change your password immediately</li>
            <li>Review your recent account activity</li>
            <li>Contact our security team if you have concerns</li>
          </ol>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated security notification from SecureBidz.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Suspicious activity alert sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending suspicious activity alert:', error);
    return { success: false, error: error.message };
  }
};
