// services/emailService.js - COMPLETE UPDATED VERSION
import nodemailer from 'nodemailer';

// Create transporter with enhanced configuration
const createTransporter = () => {
  const config = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
  };

  // Only add host, port, and secure if service is not 'gmail'
  // Gmail service handles these automatically
  if (process.env.EMAIL_SERVICE !== 'gmail') {
    config.host = process.env.EMAIL_HOST;
    config.port = process.env.EMAIL_PORT || 587;
    config.secure = process.env.EMAIL_PORT == 465;
  }

  return nodemailer.createTransport(config);
};

let transporter = createTransporter();

// Test email configuration
const testEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email transporter is ready');
    console.log('Email configured for:', process.env.EMAIL_USER);
    return true;
  } catch (error) {
    console.error('Email configuration error:', error.message);
    console.error('Please check:');
    console.error('   1. EMAIL_USER and EMAIL_PASS are set in .env');
    console.error('   2. 2-Factor Authentication is enabled on Gmail');
    console.error('   3. App Password is generated and correct');
    console.error('   4. Visit: https://myaccount.google.com/apppasswords');
    return false;
  }
};

// Initialize email service
testEmailConfig();

// Send OTP email
const sendOtpEmail = async (email, otp, name = 'User') => {
  try {
    // Create a fresh transporter for this email
    const emailTransporter = createTransporter();
    
    const mailOptions = {
      from: "Finovo App <" + process.env.EMAIL_USER + ">",
      to: email,
      subject: 'Your Finovo Verification Code',
      html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
        .logo { color: #5a2d82; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .tagline { color: #666; font-size: 16px; }
        .otp-section { text-align: center; margin: 40px 0; }
        .otp-code { background: linear-gradient(135deg, #ff1493, #ff69b4); color: white; padding: 20px 40px; font-size: 42px; font-weight: bold; text-align: center; border-radius: 15px; margin: 30px 0; letter-spacing: 12px; display: inline-block; box-shadow: 0 10px 30px rgba(255, 20, 147, 0.3); }
        .instructions { color: #555; line-height: 1.8; font-size: 16px; text-align: center; margin-bottom: 30px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center; color: #856404; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 14px; border-top: 1px solid #f0f0f0; padding-top: 20px; }
        .social-links { margin: 20px 0; }
        .social-links a { margin: 0 10px; color: #5a2d82; text-decoration: none; }
        @media (max-width: 600px) { 
          .container { padding: 20px; margin: 10px; }
          .otp-code { font-size: 32px; padding: 15px 30px; letter-spacing: 8px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FINOVO</div>
            <div class="tagline">Smart Finance Management</div>
        </div>
        
        <h2 style="text-align: center; color: #333; margin-bottom: 20px;">Email Verification</h2>
        
        <p class="instructions">
            Hello <strong>${name}</strong>,<br>
            Please use the following verification code to complete your registration:
        </p>
        
        <div class="otp-section">
            <div class="otp-code">${otp}</div>
        </div>
        
        <div class="warning">
            <strong>Important:</strong> This code will expire in 10 minutes. 
            Do not share this code with anyone.
        </div>
        
        <p class="instructions">
            If you didn't request this code, please ignore this email or contact our support team.
        </p>
        
        <div class="footer">
            <div class="social-links">
                <a href="#">Website</a> • 
                <a href="#">Support</a> • 
                <a href="#">Privacy Policy</a>
            </div>
            <p>&copy; 2024 Finovo App. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('OTP email sent successfully to ' + email);
    console.log('Message ID: ' + result.messageId);
    console.log('Email delivered from: ' + process.env.EMAIL_USER);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email: ' + error.message);
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: "Finovo App <" + process.env.EMAIL_USER + ">",
      to: email,
      subject: 'Welcome to Finovo - Your Account is Ready!',
      html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { color: #5a2d82; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .welcome-message { color: #333; line-height: 1.8; text-align: center; margin: 30px 0; }
        .features { margin: 40px 0; }
        .feature-item { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 15px; margin: 15px 0; display: flex; align-items: center; gap: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
        .feature-icon { font-size: 24px; }
        .feature-text { flex: 1; }
        .cta-button { display: block; width: 200px; margin: 30px auto; padding: 15px 30px; background: linear-gradient(135deg, #ff1493, #ff69b4); color: white; text-decoration: none; border-radius: 50px; text-align: center; font-weight: bold; box-shadow: 0 10px 30px rgba(255, 20, 147, 0.3); transition: transform 0.3s; }
        .cta-button:hover { transform: translateY(-3px); }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 14px; border-top: 1px solid #f0f0f0; padding-top: 20px; }
        @media (max-width: 600px) { 
          .container { padding: 20px; margin: 10px; }
          .feature-item { flex-direction: column; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FINOVO</div>
            <h1 style="color: #5a2d82; margin: 20px 0;">Welcome aboard, ${name}!</h1>
        </div>
        
        <div class="welcome-message">
            <p>Your email has been successfully verified and your Finovo account is now fully active!</p>
            <p>We're excited to help you take control of your finances with our powerful tools.</p>
        </div>
        
        <div class="features">
            <div class="feature-item">
                <div class="feature-icon">💰</div>
                <div class="feature-text">
                    <h3>Income Tracking</h3>
                    <p>Monitor your earnings and income sources in one place</p>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon">📊</div>
                <div class="feature-text">
                    <h3>Expense Management</h3>
                    <p>Track and categorize your spending with smart analytics</p>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon">🔔</div>
                <div class="feature-text">
                    <h3>Bill Reminders</h3>
                    <p>Never miss a payment with automated reminders</p>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon">🤝</div>
                <div class="feature-text">
                    <h3>Money Tracking</h3>
                    <p>Manage borrowed and lent amounts effortlessly</p>
                </div>
            </div>
        </div>
        
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="cta-button">
            Start Exploring →
        </a>
        
        <div class="footer">
            <p>Need help? Contact our support team at support@finovo.com</p>
            <p>&copy; 2024 Finovo App. All rights reserved.</p>
            <p>This is an automated welcome message.</p>
        </div>
    </div>
</body>
</html>`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to ' + email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, name = 'User') => {
  try {
    const resetUrl = (process.env.CLIENT_URL || 'http://localhost:5173') + '/reset-password?token=' + resetToken;
    
    const mailOptions = {
      from: "Finovo App <" + process.env.EMAIL_USER + ">",
      to: email,
      subject: 'Reset Your Finovo Password',
      html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { color: #5a2d82; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .message { color: #555; line-height: 1.8; font-size: 16px; margin: 30px 0; }
        .reset-button { display: block; width: 250px; margin: 30px auto; padding: 15px 30px; background: linear-gradient(135deg, #ff1493, #ff69b4); color: white; text-decoration: none; border-radius: 50px; text-align: center; font-weight: bold; box-shadow: 0 10px 30px rgba(255, 20, 147, 0.3); transition: transform 0.3s; }
        .reset-button:hover { transform: translateY(-3px); }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center; color: #856404; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 14px; border-top: 1px solid #f0f0f0; padding-top: 20px; }
        @media (max-width: 600px) { 
          .container { padding: 20px; margin: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FINOVO</div>
            <h2 style="color: #333;">Password Reset Request</h2>
        </div>
        
        <div class="message">
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset your Finovo account password. Click the button below to create a new password:</p>
        </div>
        
        <a href="${resetUrl}" class="reset-button">
            Reset Your Password
        </a>
        
        <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour. 
            If you didn't request this reset, please ignore this email.
        </div>
        
        <div class="message">
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 14px;">
                ${resetUrl}
            </p>
        </div>
        
        <div class="footer">
            <p>Need help? Contact our support team at support@finovo.com</p>
            <p>&copy; 2024 Finovo App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to ' + email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email: ' + error.message);
  }
};

export {
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  transporter,
  testEmailConfig
};