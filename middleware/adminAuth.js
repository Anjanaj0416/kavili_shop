// middleware/adminAuth.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Store failed login attempts (in production, use Redis or database)
const failedLoginAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Admin authentication middleware
export async function adminAuth(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token required"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.SECRET);
        
        // Verify user exists in database
        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if user has admin role
        if (user.type !== "admin") {
            logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', {
                userId: user.userId,
                firstName: user.firstName,
                ipAddress: req.ip,
                timestamp: new Date()
            });
            
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required."
            });
        }

        // Add user info to request object
        req.user = {
            userId: decoded.userId,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            phonenumber: decoded.phonenumber,
            type: decoded.type || user.type,
            homeaddress: decoded.homeaddress
        };

        next();
    } catch (error) {
        console.error("Admin authentication error:", error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Authentication failed",
                error: error.message
            });
        }
    }
}

// Check for account lockout
export function checkAccountLockout(identifier) {
    const attempts = failedLoginAttempts.get(identifier);
    
    if (attempts && attempts.count >= MAX_FAILED_ATTEMPTS) {
        const lockoutExpiry = attempts.firstAttempt + LOCKOUT_DURATION;
        
        if (Date.now() < lockoutExpiry) {
            const remainingTime = Math.ceil((lockoutExpiry - Date.now()) / 60000);
            return {
                locked: true,
                remainingMinutes: remainingTime
            };
        } else {
            // Lockout expired, reset attempts
            failedLoginAttempts.delete(identifier);
            return { locked: false };
        }
    }
    
    return { locked: false };
}

// Record failed login attempt
export function recordFailedLogin(identifier) {
    const attempts = failedLoginAttempts.get(identifier) || {
        count: 0,
        firstAttempt: Date.now()
    };
    
    attempts.count++;
    
    if (attempts.count === 1) {
        attempts.firstAttempt = Date.now();
    }
    
    failedLoginAttempts.set(identifier, attempts);
    
    // Log suspicious activity
    if (attempts.count >= MAX_FAILED_ATTEMPTS) {
        logSecurityEvent('ACCOUNT_LOCKED', {
            identifier,
            attemptCount: attempts.count,
            timestamp: new Date()
        });
    }
}

// Clear failed login attempts on successful login
export function clearFailedAttempts(identifier) {
    failedLoginAttempts.delete(identifier);
}

// Security event logging
export function logSecurityEvent(eventType, details) {
    const logEntry = {
        eventType,
        ...details,
        timestamp: new Date().toISOString()
    };
    
    // In production, send to logging service (e.g., Winston, CloudWatch)
    console.log('[SECURITY EVENT]', JSON.stringify(logEntry, null, 2));
    
    // TODO: Implement proper logging to file or external service
    // Example: winston.log('security', logEntry);
}

// Audit admin actions
export function auditAdminAction(req, action, targetUserId = null) {
    logSecurityEvent('ADMIN_ACTION', {
        adminUserId: req.user.userId,
        adminName: `${req.user.firstName} ${req.user.lastName}`,
        action,
        targetUserId,
        ipAddress: req.ip,
        timestamp: new Date()
    });
}