// middleware/secureAuth.js
/**
 * Secure Authentication & Token Management
 * 
 * Improvements over current implementation:
 * 1. Token expiry and refresh mechanism
 * 2. Token blacklist for logout
 * 3. Device fingerprinting
 * 4. Account lockout after failed attempts
 * 5. Secure token storage recommendations
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user.js';

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set();
const failedLoginAttempts = new Map(); // Track failed login attempts

// Configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Generate device fingerprint from request
 */
function generateDeviceFingerprint(req) {
    const components = [
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
        req.ip || ''
    ];
    
    return crypto
        .createHash('sha256')
        .update(components.join('|'))
        .digest('hex');
}

/**
 * Check if account is locked due to failed login attempts
 */
export function isAccountLocked(identifier) {
    const attempts = failedLoginAttempts.get(identifier);
    
    if (!attempts) return false;
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLock = Date.now() - attempts.lockTime;
        
        if (timeSinceLock < LOCKOUT_DURATION) {
            return {
                locked: true,
                remainingTime: Math.ceil((LOCKOUT_DURATION - timeSinceLock) / 1000 / 60)
            };
        } else {
            // Lockout period expired, reset attempts
            failedLoginAttempts.delete(identifier);
            return false;
        }
    }
    
    return false;
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(identifier) {
    const attempts = failedLoginAttempts.get(identifier) || { count: 0, lockTime: null };
    
    attempts.count += 1;
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        attempts.lockTime = Date.now();
        console.error(`[SECURITY] Account locked: ${identifier} (${attempts.count} failed attempts)`);
    }
    
    failedLoginAttempts.set(identifier, attempts);
    
    // Auto-cleanup after lockout duration
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        setTimeout(() => {
            failedLoginAttempts.delete(identifier);
            console.log(`[SECURITY] Account unlocked: ${identifier}`);
        }, LOCKOUT_DURATION);
    }
}

/**
 * Clear failed login attempts on successful login
 */
export function clearFailedLoginAttempts(identifier) {
    failedLoginAttempts.delete(identifier);
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(user, req) {
    const deviceFingerprint = generateDeviceFingerprint(req);
    
    return jwt.sign(
        {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            type: user.type,
            phonenumber: user.phonenumber,
            homeaddress: user.homeaddress,
            email: user.email,
            deviceFingerprint, // Add device fingerprint
            tokenType: 'access'
        },
        process.env.SECRET,
        { 
            expiresIn: ACCESS_TOKEN_EXPIRY,
            issuer: 'udari-online-shop',
            audience: user.type === 'admin' ? 'admin' : 'customer'
        }
    );
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(user) {
    return jwt.sign(
        {
            userId: user.userId,
            type: user.type,
            tokenType: 'refresh'
        },
        process.env.SECRET,
        { 
            expiresIn: REFRESH_TOKEN_EXPIRY,
            issuer: 'udari-online-shop',
            audience: user.type === 'admin' ? 'admin' : 'customer'
        }
    );
}

/**
 * Enhanced authentication middleware with token validation
 */
export async function authenticateToken(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token required",
                code: 'TOKEN_MISSING'
            });
        }

        // Check if token is blacklisted (logged out)
        if (tokenBlacklist.has(token)) {
            return res.status(401).json({
                success: false,
                message: "Token has been revoked. Please login again.",
                code: 'TOKEN_REVOKED'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.SECRET, {
            issuer: 'udari-online-shop'
        });

        // Verify token type
        if (decoded.tokenType !== 'access') {
            return res.status(401).json({
                success: false,
                message: "Invalid token type",
                code: 'INVALID_TOKEN_TYPE'
            });
        }

        // Verify device fingerprint
        const currentFingerprint = generateDeviceFingerprint(req);
        if (decoded.deviceFingerprint && decoded.deviceFingerprint !== currentFingerprint) {
            console.warn(`[SECURITY] Device fingerprint mismatch for user ${decoded.userId}`);
            // Optionally reject or just log for monitoring
            // return res.status(401).json({ success: false, message: "Device mismatch detected" });
        }

        // Verify user still exists
        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
                code: 'USER_NOT_FOUND'
            });
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            phonenumber: decoded.phonenumber,
            type: decoded.type || user.type,
            email: decoded.email
        };

        next();
    } catch (error) {
        console.error("Authentication error:", error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
                code: 'TOKEN_INVALID',
                error: error.message
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired. Please refresh your token.",
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Authentication failed",
                code: 'AUTH_ERROR',
                error: error.message
            });
        }
    }
}

/**
 * Logout and blacklist token
 */
export function logout(req, res) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            // Add token to blacklist
            tokenBlacklist.add(token);
            
            // Auto-remove from blacklist after token would have expired anyway
            setTimeout(() => {
                tokenBlacklist.delete(token);
            }, 60 * 60 * 1000); // 1 hour (ACCESS_TOKEN_EXPIRY)
            
            console.log(`[AUTH] User logged out, token blacklisted`);
        }
        
        res.json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: "Logout failed",
            error: error.message
        });
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(req, res) {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token required"
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.SECRET, {
            issuer: 'udari-online-shop'
        });

        // Verify token type
        if (decoded.tokenType !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: "Invalid token type"
            });
        }

        // Get user
        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(user, req);

        res.json({
            success: true,
            accessToken: newAccessToken,
            expiresIn: ACCESS_TOKEN_EXPIRY
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Refresh token expired. Please login again.",
                code: 'REFRESH_TOKEN_EXPIRED'
            });
        }
        
        res.status(401).json({
            success: false,
            message: "Invalid refresh token",
            error: error.message
        });
    }
}

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
    // Clean up failed login attempts
    const now = Date.now();
    let cleanedAttempts = 0;
    
    for (const [identifier, attempts] of failedLoginAttempts.entries()) {
        if (attempts.lockTime && (now - attempts.lockTime > LOCKOUT_DURATION)) {
            failedLoginAttempts.delete(identifier);
            cleanedAttempts++;
        }
    }
    
    if (cleanedAttempts > 0) {
        console.log(`[AUTH] Cleaned ${cleanedAttempts} expired login attempt records`);
    }
}, 600000); // Every 10 minutes

export default {
    authenticateToken,
    generateAccessToken,
    generateRefreshToken,
    logout,
    refreshAccessToken,
    isAccountLocked,
    recordFailedLogin,
    clearFailedLoginAttempts,
    generateDeviceFingerprint
};