/**
 * Email Service
 * Handles sending emails (OTP codes, notifications, etc.)
 */

class EmailService {
    constructor() {
        this.configured = false;
        this.transporter = null;
        
        // Try to configure with environment variables
        this.configure();
    }

    /**
     * Configure email service with SMTP settings
     */
    configure() {
        try {
            // Check if nodemailer is available
            try {
                const nodemailer = require('nodemailer');
                
                // Create transporter
                this.transporter = nodemailer.createTransport({
                    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.EMAIL_PORT || '587'),
                    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                    this.configured = true;
                    console.log('Email service configured successfully');
                } else {
                    console.log('Email service not configured (missing EMAIL_USER or EMAIL_PASS)');
                }
            } catch (e) {
                console.log('Nodemailer not installed. Install with: npm install nodemailer');
            }
        } catch (error) {
            console.error('Error configuring email service:', error);
        }
    }

    /**
     * Send OTP code via email
     */
    async sendOTP(email, otp) {
        if (!this.configured) {
            console.log(`[EMAIL MOCK] Would send OTP ${otp} to ${email}`);
            // In development, log OTP to console
            console.log(`\n========================================`);
            console.log(`🔐 OTP Code for ${email}: ${otp}`);
            console.log(`========================================\n`);
            return { success: true, mock: true };
        }

        try {
            const info = await this.transporter.sendMail({
                from: `"FinTrackr" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'FinTrackr - Your OTP Code',
                text: `Your FinTrackr verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
                html: this.getOTPTemplate(otp)
            });

            console.log('OTP email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending OTP email:', error);
            // Fallback to console in case of error
            console.log(`\n========================================`);
            console.log(`🔐 OTP Code (fallback) for ${email}: ${otp}`);
            console.log(`========================================\n`);
            throw error;
        }
    }

    /**
     * Get HTML template for OTP email
     */
    getOTPTemplate(otp) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #7c3aed;
            margin-bottom: 20px;
        }
        .otp-box {
            background: white;
            border: 2px solid #7c3aed;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #7c3aed;
        }
        .message {
            color: #666;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🔐 FinTrackr</div>
        <h2>Your Verification Code</h2>
        <p class="message">
            Use this code to verify your identity. This code will expire in 5 minutes.
        </p>
        <div class="otp-box">${otp}</div>
        <p class="message">
            If you didn't request this code, please ignore this email.
        </p>
        <div class="footer">
            <p>This is an automated message from FinTrackr. Please do not reply.</p>
            <p>&copy; 2025 FinTrackr. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * Send notification email
     */
    async sendNotification(email, subject, message) {
        if (!this.configured) {
            console.log(`[EMAIL MOCK] Would send notification to ${email}: ${subject}`);
            return { success: true, mock: true };
        }

        try {
            const info = await this.transporter.sendMail({
                from: `"FinTrackr" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `FinTrackr - ${subject}`,
                text: message,
                html: `<div style="font-family: sans-serif; padding: 20px;">${message.replace(/\n/g, '<br>')}</div>`
            });

            console.log('Notification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending notification email:', error);
            throw error;
        }
    }

    /**
     * Check if email service is configured
     */
    isConfigured() {
        return this.configured;
    }
}

module.exports = new EmailService();
