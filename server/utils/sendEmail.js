/**
 * Email Sending Utility
 * 
 * Provides a reusable function to send emails
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text email body
 * @param {String} options.html - HTML email body
 * @param {Array} options.attachments - Email attachments
 * @returns {Promise} - Resolved with nodemailer result
 */
const sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.auth.user,
      pass: config.email.auth.pass
    }
  });

  // Define mail options
  const mailOptions = {
    from: `A Defection <${config.email.from}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments || []
  };

  try {
    // Send email
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw error;
  }
};

/**
 * Send welcome email to new user
 * @param {Object} user - User object
 * @param {String} verificationUrl - Email verification URL
 * @returns {Promise} - Resolved with nodemailer result
 */
const sendWelcomeEmail = async (user, verificationUrl) => {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to A Defection',
    text: `Welcome to A Defection, ${user.username}! Please verify your email by clicking the following link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to A Defection!</h2>
        <p>Dear ${user.username},</p>
        <p>Thank you for joining our interactive narrative platform. We're excited to have you!</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="text-align: center;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </p>
        <p>If the button doesn't work, you can copy and paste the following link in your browser:</p>
        <p>${verificationUrl}</p>
        <p>Start creating characters and joining narratives right away!</p>
        <p>Best regards,<br>A Defection Team</p>
      </div>
    `
  });
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {String} resetUrl - Password reset URL
 * @returns {Promise} - Resolved with nodemailer result
 */
const sendPasswordResetEmail = async (user, resetUrl) => {
  return sendEmail({
    to: user.email,
    subject: 'Password Reset - A Defection',
    text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}. This link will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Dear ${user.username},</p>
        <p>You requested a password reset. Please click the button below to reset your password:</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </p>
        <p>If the button doesn't work, you can copy and paste the following link in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>A Defection Team</p>
      </div>
    `
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
}; 