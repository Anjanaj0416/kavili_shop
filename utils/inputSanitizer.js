// utils/inputSanitizer.js
/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL Injection, and other injection attacks
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input) {
    if (!input || typeof input !== 'string') {
        return input;
    }
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
        .substring(0, 500); // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return null;
    }
    
    const sanitized = email.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    
    if (!emailRegex.test(sanitized)) {
        return null;
    }
    
    // Limit length
    if (sanitized.length > 254) {
        return null;
    }
    
    return sanitized;
}

/**
 * Sanitize phone number input
 */
export function sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        return null;
    }
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Validate length (10 digits for Sri Lankan numbers)
    if (cleaned.length !== 10) {
        return null;
    }
    
    return cleaned;
}

/**
 * Sanitize name input
 */
export function sanitizeName(name) {
    if (!name || typeof name !== 'string') {
        return null;
    }
    
    return name
        .trim()
        .replace(/[^a-zA-Z\s'-]/g, '') // Allow only letters, spaces, hyphens, and apostrophes
        .substring(0, 50); // Limit length
}

/**
 * Sanitize address input
 */
export function sanitizeAddress(address) {
    if (!address || typeof address !== 'string') {
        return null;
    }
    
    return address
        .trim()
        .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
        .substring(0, 200); // Limit length
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    const sanitized = {};
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            
            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }
    
    return sanitized;
}

/**
 * Validate and sanitize product ID
 */
export function sanitizeProductId(productId) {
    if (!productId || typeof productId !== 'string') {
        return null;
    }
    
    // Product IDs should be alphanumeric with optional hyphens/underscores
    const cleaned = productId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (cleaned.length === 0 || cleaned.length > 50) {
        return null;
    }
    
    return cleaned;
}

/**
 * Validate and sanitize order ID
 */
export function sanitizeOrderId(orderId) {
    if (!orderId || typeof orderId !== 'string') {
        return null;
    }
    
    // Order IDs should match format: ORD-timestamp-random
    const cleaned = orderId.trim();
    
    if (!/^ORD-\d+-\d+$/.test(cleaned)) {
        return null;
    }
    
    return cleaned;
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }
    
    const cleaned = url.trim();
    
    // Only allow http and https protocols
    if (!/^https?:\/\/.+/.test(cleaned)) {
        return null;
    }
    
    return cleaned;
}

/**
 * Rate limiting helper - check if too many requests
 */
const requestCounts = new Map();

export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const userRequests = requestCounts.get(identifier) || { count: 0, resetTime: now + windowMs };
    
    // Reset if window has passed
    if (now > userRequests.resetTime) {
        requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1 };
    }
    
    // Check if limit exceeded
    if (userRequests.count >= maxRequests) {
        return { 
            allowed: false, 
            remaining: 0,
            resetTime: userRequests.resetTime
        };
    }
    
    // Increment count
    userRequests.count++;
    requestCounts.set(identifier, userRequests);
    
    return { 
        allowed: true, 
        remaining: maxRequests - userRequests.count 
    };
}