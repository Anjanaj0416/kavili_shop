// middleware/securityLogger.js
/**
 * Enhanced Security Logging & Monitoring System
 * 
 * Features:
 * 1. Persistent logging to files with rotation
 * 2. Security event tracking
 * 3. Suspicious activity detection
 * 4. Real-time alerts for critical events
 * 5. Audit trail for compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log directory
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file paths
const SECURITY_LOG = path.join(LOG_DIR, 'security.log');
const ERROR_LOG = path.join(LOG_DIR, 'errors.log');
const ACCESS_LOG = path.join(LOG_DIR, 'access.log');
const AUDIT_LOG = path.join(LOG_DIR, 'audit.log');

// Security event types
export const SecurityEventTypes = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    CSRF_ATTACK: 'CSRF_ATTACK',
    SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
    XSS_ATTEMPT: 'XSS_ATTEMPT',
    FILE_UPLOAD_THREAT: 'FILE_UPLOAD_THREAT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
    ADMIN_ACTION: 'ADMIN_ACTION',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PROFILE_UPDATE: 'PROFILE_UPDATE',
    ORDER_PLACED: 'ORDER_PLACED',
    ORDER_MODIFIED: 'ORDER_MODIFIED'
};

// Suspicious activity patterns
const suspiciousPatterns = {
    rapidRequests: new Map(), // Track request frequency per IP
    failedLogins: new Map(),   // Track failed login attempts
    sensitiveEndpoints: ['/api/admin', '/api/users/profile', '/api/orders']
};

/**
 * Write to log file with rotation
 */
function writeToLog(logFile, message) {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        
        fs.appendFileSync(logFile, logEntry);
        
        // Check file size and rotate if necessary (max 10MB)
        const stats = fs.statSync(logFile);
        if (stats.size > 10 * 1024 * 1024) {
            rotateLog(logFile);
        }
    } catch (error) {
        console.error('Error writing to log:', error);
    }
}

/**
 * Rotate log files
 */
function rotateLog(logFile) {
    try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const rotatedFile = `${logFile}.${timestamp}`;
        
        fs.renameSync(logFile, rotatedFile);
        console.log(`Log rotated: ${rotatedFile}`);
        
        // Keep only last 5 rotated files
        const logDir = path.dirname(logFile);
        const logBasename = path.basename(logFile);
        const files = fs.readdirSync(logDir)
            .filter(f => f.startsWith(logBasename) && f !== logBasename)
            .sort()
            .reverse();
        
        if (files.length > 5) {
            files.slice(5).forEach(file => {
                fs.unlinkSync(path.join(logDir, file));
                console.log(`Deleted old log: ${file}`);
            });
        }
    } catch (error) {
        console.error('Error rotating log:', error);
    }
}

/**
 * Log security event
 */
export function logSecurityEvent(eventType, details) {
    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...details
    };
    
    const message = JSON.stringify(event);
    writeToLog(SECURITY_LOG, message);
    
    // Also log to console for development
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[SECURITY EVENT] ${eventType}:`, details);
    }
    
    // Alert on critical events
    if (isCriticalEvent(eventType)) {
        sendSecurityAlert(event);
    }
}

/**
 * Log error
 */
export function logError(error, context = {}) {
    const errorLog = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
    };
    
    writeToLog(ERROR_LOG, JSON.stringify(errorLog));
    console.error('[ERROR]', error);
}

/**
 * Log access (HTTP requests)
 */
export function logAccess(req, res, responseTime) {
    const accessLog = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user?.userId || 'anonymous',
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
    };
    
    writeToLog(ACCESS_LOG, JSON.stringify(accessLog));
}

/**
 * Log audit trail (important business actions)
 */
export function logAudit(action, actor, details) {
    const auditLog = {
        action,
        actor: {
            userId: actor.userId,
            type: actor.type,
            name: `${actor.firstName} ${actor.lastName}`
        },
        details,
        timestamp: new Date().toISOString()
    };
    
    writeToLog(AUDIT_LOG, JSON.stringify(auditLog));
    console.log('[AUDIT]', action, 'by', actor.userId);
}

/**
 * Detect suspicious activity
 */
export function detectSuspiciousActivity(req) {
    const ip = req.ip;
    const url = req.originalUrl;
    const now = Date.now();
    
    // Track rapid requests from same IP
    if (!suspiciousPatterns.rapidRequests.has(ip)) {
        suspiciousPatterns.rapidRequests.set(ip, []);
    }
    
    const requests = suspiciousPatterns.rapidRequests.get(ip);
    requests.push(now);
    
    // Keep only requests from last minute
    const recentRequests = requests.filter(time => now - time < 60000);
    suspiciousPatterns.rapidRequests.set(ip, recentRequests);
    
    // Alert if too many requests
    if (recentRequests.length > 100) {
        logSecurityEvent(SecurityEventTypes.SUSPICIOUS_ACTIVITY, {
            ip,
            reason: 'Excessive requests',
            count: recentRequests.length,
            url
        });
        return true;
    }
    
    // Check for sensitive endpoint access patterns
    const isSensitive = suspiciousPatterns.sensitiveEndpoints.some(
        endpoint => url.startsWith(endpoint)
    );
    
    if (isSensitive && !req.user) {
        logSecurityEvent(SecurityEventTypes.UNAUTHORIZED_ACCESS, {
            ip,
            url,
            method: req.method
        });
    }
    
    return false;
}

/**
 * Track failed login attempts
 */
export function trackFailedLogin(identifier, ip) {
    const key = `${identifier}_${ip}`;
    
    if (!suspiciousPatterns.failedLogins.has(key)) {
        suspiciousPatterns.failedLogins.set(key, { count: 0, firstAttempt: Date.now() });
    }
    
    const attempts = suspiciousPatterns.failedLogins.get(key);
    attempts.count++;
    
    // Alert if too many failed attempts
    if (attempts.count >= 5) {
        logSecurityEvent(SecurityEventTypes.LOGIN_FAILURE, {
            identifier,
            ip,
            attempts: attempts.count,
            duration: Date.now() - attempts.firstAttempt,
            severity: 'HIGH'
        });
    }
    
    // Clean up after 15 minutes
    setTimeout(() => {
        suspiciousPatterns.failedLogins.delete(key);
    }, 15 * 60 * 1000);
}

/**
 * Determine if event is critical
 */
function isCriticalEvent(eventType) {
    const criticalEvents = [
        SecurityEventTypes.SQL_INJECTION_ATTEMPT,
        SecurityEventTypes.XSS_ATTEMPT,
        SecurityEventTypes.CSRF_ATTACK,
        SecurityEventTypes.DATA_BREACH_ATTEMPT,
        SecurityEventTypes.ACCOUNT_LOCKED,
        SecurityEventTypes.FILE_UPLOAD_THREAT
    ];
    
    return criticalEvents.includes(eventType);
}

/**
 * Send security alert (email, SMS, webhook, etc.)
 */
function sendSecurityAlert(event) {
    // In production, implement actual alerting mechanism
    // For now, just log to console
    console.error('🚨 SECURITY ALERT:', event.type);
    console.error('Details:', event);
    
    // Example: Send email, Slack notification, PagerDuty alert, etc.
    // You can integrate with services like:
    // - SendGrid for email
    // - Twilio for SMS
    // - Slack webhook for notifications
    // - PagerDuty for incident management
}

/**
 * Middleware to log all requests
 */
export function requestLogger(req, res, next) {
    const startTime = Date.now();
    
    // Detect suspicious activity
    detectSuspiciousActivity(req);
    
    // Log response when it's sent
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        logAccess(req, res, responseTime);
    });
    
    next();
}

/**
 * Middleware to log errors
 */
export function errorLogger(error, req, res, next) {
    logError(error, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.userId,
        body: req.body
    });
    next(error);
}

/**
 * Generate security report
 */
export function generateSecurityReport(days = 7) {
    try {
        const securityLogs = fs.readFileSync(SECURITY_LOG, 'utf-8');
        const lines = securityLogs.split('\n').filter(Boolean);
        
        const events = lines.map(line => {
            try {
                const match = line.match(/\[(.*?)\] (.+)/);
                if (match) {
                    return JSON.parse(match[2]);
                }
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
        
        // Filter events from last N days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentEvents = events.filter(event => 
            new Date(event.timestamp) > cutoffDate
        );
        
        // Generate statistics
        const report = {
            period: `Last ${days} days`,
            totalEvents: recentEvents.length,
            eventsByType: {},
            criticalEvents: [],
            topIPs: {},
            topUsers: {}
        };
        
        recentEvents.forEach(event => {
            // Count by type
            report.eventsByType[event.type] = (report.eventsByType[event.type] || 0) + 1;
            
            // Track critical events
            if (isCriticalEvent(event.type)) {
                report.criticalEvents.push(event);
            }
            
            // Track IPs
            if (event.ip) {
                report.topIPs[event.ip] = (report.topIPs[event.ip] || 0) + 1;
            }
            
            // Track users
            if (event.userId) {
                report.topUsers[event.userId] = (report.topUsers[event.userId] || 0) + 1;
            }
        });
        
        return report;
    } catch (error) {
        console.error('Error generating security report:', error);
        return { error: error.message };
    }
}

/**
 * Export logs for analysis
 */
export function exportLogs(startDate, endDate) {
    try {
        const logs = {
            security: fs.readFileSync(SECURITY_LOG, 'utf-8'),
            errors: fs.readFileSync(ERROR_LOG, 'utf-8'),
            access: fs.readFileSync(ACCESS_LOG, 'utf-8'),
            audit: fs.readFileSync(AUDIT_LOG, 'utf-8')
        };
        
        // Filter by date range if provided
        if (startDate || endDate) {
            Object.keys(logs).forEach(logType => {
                const lines = logs[logType].split('\n');
                const filtered = lines.filter(line => {
                    const match = line.match(/\[(.*?)\]/);
                    if (match) {
                        const timestamp = new Date(match[1]);
                        if (startDate && timestamp < new Date(startDate)) return false;
                        if (endDate && timestamp > new Date(endDate)) return false;
                        return true;
                    }
                    return false;
                });
                logs[logType] = filtered.join('\n');
            });
        }
        
        return logs;
    } catch (error) {
        console.error('Error exporting logs:', error);
        return { error: error.message };
    }
}

// Clean up old logs periodically (every 24 hours)
setInterval(() => {
    console.log('[LOG CLEANUP] Checking for old logs...');
    // This is already handled in rotateLog, but we can add additional cleanup here
}, 24 * 60 * 60 * 1000);

export default {
    logSecurityEvent,
    logError,
    logAccess,
    logAudit,
    detectSuspiciousActivity,
    trackFailedLogin,
    requestLogger,
    errorLogger,
    generateSecurityReport,
    exportLogs,
    SecurityEventTypes
};