// utils/passwordValidator.js

/**
 * Password validation for admin accounts
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - No common passwords
 */

const COMMON_PASSWORDS = [
    'password', 'password123', 'admin123', '12345678', 'qwerty123',
    'welcome123', 'admin@123', 'administrator', 'root', 'toor'
];

export function validatePassword(password) {
    const errors = [];
    
    // Check length
    if (password.length < 12) {
        errors.push('Password must be at least 12 characters long');
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    // Check for number
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    // Check against common passwords
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
        errors.push('This password is too common. Please choose a stronger password');
    }
    
    // Check for sequential characters
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
        errors.push('Password should not contain sequential characters (e.g., abc, 123)');
    }
    
    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
        errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Calculate password strength
 * @param {string} password
 * @returns {object} { score: number (0-100), level: string }
 */
export function calculatePasswordStrength(password) {
    let score = 0;
    
    // Length score
    if (password.length >= 12) score += 25;
    else if (password.length >= 10) score += 15;
    else if (password.length >= 8) score += 10;
    
    // Character variety score
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;
    
    // Complexity bonus
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 10) score += 15;
    else if (uniqueChars >= 8) score += 10;
    
    // Penalty for common patterns
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) score -= 50;
    if (/(.)\1{2,}/.test(password)) score -= 15;
    if (/(?:abc|bcd|cde|123|234|345)/i.test(password)) score -= 10;
    
    score = Math.max(0, Math.min(100, score));
    
    let level;
    if (score >= 80) level = 'Strong';
    else if (score >= 60) level = 'Good';
    else if (score >= 40) level = 'Fair';
    else level = 'Weak';
    
    return { score, level };
}

/**
 * Generate a suggestion for password improvement
 */
export function getPasswordSuggestions(password) {
    const suggestions = [];
    
    if (password.length < 12) {
        suggestions.push('Use at least 12 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
        suggestions.push('Add uppercase letters');
    }
    
    if (!/[a-z]/.test(password)) {
        suggestions.push('Add lowercase letters');
    }
    
    if (!/[0-9]/.test(password)) {
        suggestions.push('Add numbers');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        suggestions.push('Add special characters (!@#$%^&*...)');
    }
    
    const uniqueChars = new Set(password).size;
    if (uniqueChars < 8) {
        suggestions.push('Use more variety of characters');
    }
    
    if (/(.)\1{2,}/.test(password)) {
        suggestions.push('Avoid repeating characters');
    }
    
    return suggestions;
}