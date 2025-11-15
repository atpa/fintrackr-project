const express = require('express');
const router = express.Router();
const crypto = require('crypto');

/**
 * 2FA Router - Two-Factor Authentication
 * Provides email-based OTP (One-Time Password) authentication
 */

// In-memory OTP storage (in production, use database)
const otpStore = new Map();

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a random 6-digit OTP code
 */
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * POST /api/2fa/enable
 * Enable 2FA for the authenticated user
 */
router.post('/enable', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const dataService = req.app.get('dataService');
        const emailService = req.app.get('emailService');
        
        // Get user
        const user = await dataService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already enabled
        if (user.twofa_enabled) {
            return res.status(400).json({ error: '2FA already enabled' });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + OTP_EXPIRY_MS;

        // Store OTP
        otpStore.set(`enable_${userId}`, { otp, expiresAt, email: user.email });

        // Send email
        await emailService.sendOTP(user.email, otp);

        res.json({
            success: true,
            message: 'OTP sent to your email. Please verify to enable 2FA.',
            expiresIn: OTP_EXPIRY_MS / 1000
        });
    } catch (error) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

/**
 * POST /api/2fa/verify
 * Verify OTP code and enable 2FA
 */
router.post('/verify', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { otp, action = 'enable' } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const dataService = req.app.get('dataService');
        const key = `${action}_${userId}`;
        const stored = otpStore.get(key);

        if (!stored) {
            return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
        }

        // Check expiry
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(key);
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        // Verify OTP
        if (otp !== stored.otp) {
            return res.status(400).json({ error: 'Invalid OTP code' });
        }

        // Clear OTP
        otpStore.delete(key);

        if (action === 'enable') {
            // Enable 2FA in database
            await dataService.update2FAStatus(userId, true);
            
            res.json({
                success: true,
                message: '2FA enabled successfully'
            });
        } else if (action === 'login') {
            // 2FA verified for login
            res.json({
                success: true,
                message: '2FA verified',
                verified: true
            });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Error verifying 2FA:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});

/**
 * POST /api/2fa/disable
 * Disable 2FA for the authenticated user
 */
router.post('/disable', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const dataService = req.app.get('dataService');
        const authService = req.app.get('authService');
        
        // Get user
        const user = await dataService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify password
        const validPassword = await authService.verifyPassword(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Disable 2FA
        await dataService.update2FAStatus(userId, false);

        res.json({
            success: true,
            message: '2FA disabled successfully'
        });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

/**
 * GET /api/2fa/status
 * Check if 2FA is enabled for the authenticated user
 */
router.get('/status', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const dataService = req.app.get('dataService');
        const user = await dataService.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            enabled: user.twofa_enabled || false,
            email: user.email
        });
    } catch (error) {
        console.error('Error checking 2FA status:', error);
        res.status(500).json({ error: 'Failed to check 2FA status' });
    }
});

/**
 * POST /api/2fa/request-login-otp
 * Request OTP for 2FA login
 */
router.post('/request-login-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        const dataService = req.app.get('dataService');
        const emailService = req.app.get('emailService');
        
        // Get user by email
        const user = await dataService.getUserByEmail(email);
        if (!user || !user.twofa_enabled) {
            // Don't reveal if user exists or has 2FA enabled
            return res.json({ success: true, message: 'If 2FA is enabled, OTP has been sent' });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + OTP_EXPIRY_MS;

        // Store OTP
        otpStore.set(`login_${user.id}`, { otp, expiresAt, email: user.email });

        // Send email
        await emailService.sendOTP(user.email, otp);

        res.json({
            success: true,
            message: 'OTP sent to your email',
            expiresIn: OTP_EXPIRY_MS / 1000
        });
    } catch (error) {
        console.error('Error requesting login OTP:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

module.exports = router;
