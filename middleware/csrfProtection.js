// middleware/csrfProtection.js
/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 * 
 * CSRF attacks trick authenticated users into performing unwanted actions.
 * This middleware generates and validates CSRF tokens to prevent such attacks.
 * 
 * How it works:
 * 1. Server generates a unique token for each session
 * 2. Token is sent to client (in cookie or response)
 * 3. Client must include token in all state-changing requests (POST, PUT, DELETE)
 * 4. Server validates token before processing request
 */

import crypto from 'crypto';

// Store tokens temporarily (in production, use Redis or database)
const tokenStore = new Map();
const TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware to generate and attach CSRF token to session
 */
export function csrfTokenGenerator(req, res, next) {
    // Skip for GET, HEAD, OPTIONS requests (safe methods)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Check if user has a CSRF token in session
    const existingToken = req.cookies?.csrfToken;
    
    if (existingToken && tokenStore.has(existingToken)) {
        const tokenData = tokenStore.get(existingToken);
        
        // Check if token is still valid
        if (Date.now() - tokenData.createdAt < TOKEN_EXPIRY) {
            return next();
        } else {
            // Token expired, remove it
            tokenStore.delete(existingToken);
        }
    }

    // Generate new token
    const newToken = generateCsrfToken();
    tokenStore.set(newToken, {
        createdAt: Date.now(),
        userId: req.user?.userId || 'anonymous'
    });

    // Set token in cookie (httpOnly for security)
    res.cookie('csrfToken', newToken, {
        httpOnly: false, // Must be accessible to JavaScript for sending in headers
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // Prevent CSRF
        maxAge: TOKEN_EXPIRY
    });

    next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 */
export function csrfProtection(req, res, next) {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Get token from header (sent by frontend)
    const tokenFromHeader = req.headers['x-csrf-token'] || req.headers['csrf-token'];
    
    // Get token from cookie
    const tokenFromCookie = req.cookies?.csrfToken;

    // Validate token presence
    if (!tokenFromHeader) {
        console.error(`[CSRF] No CSRF token in header from IP: ${req.ip}`);
        console.error(`[CSRF] URL: ${req.originalUrl}`);
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing. Please refresh the page and try again.',
            code: 'CSRF_TOKEN_MISSING'
        });
    }

    if (!tokenFromCookie) {
        console.error(`[CSRF] No CSRF token in cookie from IP: ${req.ip}`);
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing. Please refresh the page and try again.',
            code: 'CSRF_COOKIE_MISSING'
        });
    }

    // Validate tokens match
    if (tokenFromHeader !== tokenFromCookie) {
        console.error(`[CSRF] Token mismatch from IP: ${req.ip}`);
        console.error(`[CSRF] Header token: ${tokenFromHeader.substring(0, 10)}...`);
        console.error(`[CSRF] Cookie token: ${tokenFromCookie.substring(0, 10)}...`);
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token. Possible CSRF attack detected.',
            code: 'CSRF_TOKEN_MISMATCH'
        });
    }

    // Validate token exists in store
    if (!tokenStore.has(tokenFromHeader)) {
        console.error(`[CSRF] Token not found in store from IP: ${req.ip}`);
        return res.status(403).json({
            success: false,
            message: 'CSRF token expired or invalid. Please refresh the page.',
            code: 'CSRF_TOKEN_INVALID'
        });
    }

    // Check token expiry
    const tokenData = tokenStore.get(tokenFromHeader);
    if (Date.now() - tokenData.createdAt > TOKEN_EXPIRY) {
        tokenStore.delete(tokenFromHeader);
        console.error(`[CSRF] Expired token from IP: ${req.ip}`);
        return res.status(403).json({
            success: false,
            message: 'CSRF token expired. Please refresh the page.',
            code: 'CSRF_TOKEN_EXPIRED'
        });
    }

    // All checks passed
    console.log(`[CSRF] Valid token from user: ${tokenData.userId}`);
    next();
}

/**
 * Endpoint to get CSRF token for frontend
 */
export function getCsrfToken(req, res) {
    const token = generateCsrfToken();
    
    tokenStore.set(token, {
        createdAt: Date.now(),
        userId: req.user?.userId || 'anonymous'
    });

    res.cookie('csrfToken', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRY
    });

    res.json({
        success: true,
        csrfToken: token,
        expiresIn: TOKEN_EXPIRY
    });
}

/**
 * Clean up expired tokens periodically
 */
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, data] of tokenStore.entries()) {
        if (now - data.createdAt > TOKEN_EXPIRY) {
            tokenStore.delete(token);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`[CSRF] Cleaned ${cleanedCount} expired tokens`);
    }
}, 600000); // Clean every 10 minutes

export default {
    csrfTokenGenerator,
    csrfProtection,
    getCsrfToken,
    generateCsrfToken
};