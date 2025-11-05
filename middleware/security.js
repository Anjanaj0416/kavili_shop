// middleware/security.js
/**
 * Enhanced Security Middleware
 * Protects against common web vulnerabilities
 */

import { checkRateLimit } from '../utils/inputSanitizer.js';

/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */
export function securityHeaders(req, res, next) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://kavili-shop-b9472.firebaseapp.com;"
    );
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 
        'geolocation=(), microphone=(), camera=()'
    );
    
    // Strict Transport Security (HTTPS only - enable in production)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
}

/**
 * Rate Limiting Middleware
 * Prevents brute force and DDoS attacks
 */
export function rateLimiter(maxRequests = 100, windowMs = 60000) {
    return (req, res, next) => {
        const identifier = req.ip || req.connection.remoteAddress;
        
        const rateLimit = checkRateLimit(identifier, maxRequests, windowMs);
        
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
        
        if (!rateLimit.allowed) {
            const resetTime = new Date(rateLimit.resetTime);
            res.setHeader('X-RateLimit-Reset', resetTime.toISOString());
            
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            });
        }
        
        next();
    };
}

/**
 * Strict Rate Limiter for Authentication Routes
 * More aggressive rate limiting for login/register endpoints
 */
export const authRateLimiter = rateLimiter(10, 60000); // 10 requests per minute

/**
 * Request Size Limiter
 * Prevents large payload attacks
 */
export function requestSizeLimiter(maxSize = '10mb') {
    return (req, res, next) => {
        const contentLength = req.headers['content-length'];
        
        if (contentLength) {
            const sizeInBytes = parseInt(contentLength);
            const maxSizeBytes = parseSize(maxSize);
            
            if (sizeInBytes > maxSizeBytes) {
                return res.status(413).json({
                    success: false,
                    message: 'Request payload too large'
                });
            }
        }
        
        next();
    };
}

/**
 * SQL Injection Protection Middleware
 * Detects and blocks SQL injection attempts
 */
export function sqlInjectionProtection(req, res, next) {
    const sqlPatterns = [
        /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
        /(\bUNION\b.*\bSELECT\b)/gi,
        /(--|\;|\/\*|\*\/)/g,
        /(\bOR\b.*=.*|AND.*=.*)/gi
    ];
    
    const checkForSqlInjection = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                
                if (typeof value === 'string') {
                    for (const pattern of sqlPatterns) {
                        if (pattern.test(value)) {
                            return true;
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    if (checkForSqlInjection(value)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    
    // Check request body, query, and params
    if (checkForSqlInjection(req.body) || 
        checkForSqlInjection(req.query) || 
        checkForSqlInjection(req.params)) {
        
        // Log suspicious activity
        console.error(`[SECURITY] SQL Injection attempt detected from IP: ${req.ip}`);
        console.error(`[SECURITY] URL: ${req.originalUrl}`);
        console.error(`[SECURITY] Body:`, JSON.stringify(req.body));
        
        return res.status(400).json({
            success: false,
            message: 'Invalid request detected'
        });
    }
    
    next();
}

/**
 * XSS Protection Middleware
 * Detects and blocks XSS attempts
 */
export function xssProtection(req, res, next) {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<img[^>]+src\s*=\s*['"]?\s*javascript:/gi
    ];
    
    const checkForXss = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                
                if (typeof value === 'string') {
                    for (const pattern of xssPatterns) {
                        if (pattern.test(value)) {
                            return true;
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    if (checkForXss(value)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    
    // Check request body, query, and params
    if (checkForXss(req.body) || 
        checkForXss(req.query) || 
        checkForXss(req.params)) {
        
        // Log suspicious activity
        console.error(`[SECURITY] XSS attempt detected from IP: ${req.ip}`);
        console.error(`[SECURITY] URL: ${req.originalUrl}`);
        
        return res.status(400).json({
            success: false,
            message: 'Invalid request detected'
        });
    }
    
    next();
}

/**
 * NoSQL Injection Protection
 * Protects against MongoDB injection attacks
 */
export function noSqlInjectionProtection(req, res, next) {
    const checkForNoSqlInjection = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                
                // Check for MongoDB operators
                if (key.startsWith('$')) {
                    return true;
                }
                
                // Check for regex injection
                if (value && typeof value === 'object') {
                    if (value.$regex || value.$where || value.$ne || value.$gt || value.$lt) {
                        return true;
                    }
                    
                    if (checkForNoSqlInjection(value)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    
    // Check request body, query, and params
    if (checkForNoSqlInjection(req.body) || 
        checkForNoSqlInjection(req.query) || 
        checkForNoSqlInjection(req.params)) {
        
        // Log suspicious activity
        console.error(`[SECURITY] NoSQL Injection attempt detected from IP: ${req.ip}`);
        console.error(`[SECURITY] URL: ${req.originalUrl}`);
        
        return res.status(400).json({
            success: false,
            message: 'Invalid request detected'
        });
    }
    
    next();
}

/**
 * Helper function to parse size strings
 */
function parseSize(size) {
    const units = {
        'b': 1,
        'kb': 1024,
        'mb': 1024 * 1024,
        'gb': 1024 * 1024 * 1024
    };
    
    const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
    
    if (!match) {
        throw new Error('Invalid size format');
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return value * units[unit];
}

/**
 * IP Whitelist/Blacklist Middleware
 * Allows only specific IPs or blocks specific IPs
 */
export function ipFilter(options = {}) {
    const { whitelist = [], blacklist = [] } = options;
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        
        // Check blacklist first
        if (blacklist.length > 0 && blacklist.includes(ip)) {
            console.error(`[SECURITY] Blocked IP attempting access: ${ip}`);
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        // Check whitelist if configured
        if (whitelist.length > 0 && !whitelist.includes(ip)) {
            console.error(`[SECURITY] Non-whitelisted IP attempting access: ${ip}`);
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        next();
    };
}

/**
 * Request Logging Middleware for Security Auditing
 */
export function securityAuditLogger(req, res, next) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.headers['user-agent'],
        userId: req.user?.userId || 'anonymous'
    };
    
    // Log sensitive operations
    const sensitivePaths = ['/api/admin', '/api/users/login', '/api/users/register'];
    const isSensitive = sensitivePaths.some(path => req.originalUrl.startsWith(path));
    
    if (isSensitive) {
        console.log('[SECURITY AUDIT]', JSON.stringify(logEntry));
    }
    
    next();
}