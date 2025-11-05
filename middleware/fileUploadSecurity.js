// middleware/fileUploadSecurity.js
/**
 * Secure File Upload Middleware
 * 
 * Protects against:
 * - Malicious file uploads (malware, scripts)
 * - File bomb attacks (huge files)
 * - MIME type spoofing
 * - Path traversal attacks
 */

import crypto from 'crypto';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
];

// Maximum file sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB (for multiple files)

// Magic numbers (file signatures) for validation
const FILE_SIGNATURES = {
    'image/jpeg': [
        [0xFF, 0xD8, 0xFF, 0xDB],
        [0xFF, 0xD8, 0xFF, 0xE0],
        [0xFF, 0xD8, 0xFF, 0xE1],
        [0xFF, 0xD8, 0xFF, 0xEE]
    ],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
    ],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]] // RIFF
};

/**
 * Validate file size
 */
export function validateFileSize(fileSize, maxSize = MAX_IMAGE_SIZE) {
    if (fileSize > maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }
    return true;
}

/**
 * Validate MIME type against whitelist
 */
export function validateMimeType(mimeType) {
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase())) {
        throw new Error(`File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
    return true;
}

/**
 * Validate file signature (magic numbers) to prevent MIME type spoofing
 */
export function validateFileSignature(buffer, mimeType) {
    const signatures = FILE_SIGNATURES[mimeType.toLowerCase()];
    
    if (!signatures) {
        throw new Error('Unsupported file type for signature validation');
    }

    // Check if buffer matches any of the valid signatures for this type
    const matchesSignature = signatures.some(signature => {
        return signature.every((byte, index) => buffer[index] === byte);
    });

    if (!matchesSignature) {
        throw new Error('File signature does not match declared MIME type. Possible file type spoofing detected.');
    }

    return true;
}

/**
 * Detect potentially malicious content in images
 */
export function scanForMaliciousContent(buffer) {
    // Convert buffer to string for pattern matching
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
    
    // Suspicious patterns that shouldn't be in image files
    const maliciousPatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // event handlers like onclick=
        /<\?php/gi,
        /eval\(/gi,
        /base64_decode/gi,
        /system\(/gi,
        /exec\(/gi,
        /passthru\(/gi,
        /shell_exec/gi
    ];

    for (const pattern of maliciousPatterns) {
        if (pattern.test(content)) {
            throw new Error('Potentially malicious content detected in file');
        }
    }

    return true;
}

/**
 * Validate filename to prevent path traversal attacks
 */
export function validateFilename(filename) {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new Error('Invalid filename: path traversal detected');
    }

    // Check for null bytes
    if (filename.includes('\0')) {
        throw new Error('Invalid filename: null byte detected');
    }

    // Validate filename length
    if (filename.length > 255) {
        throw new Error('Filename too long');
    }

    // Check for valid filename characters
    const validFilenameRegex = /^[a-zA-Z0-9_\-. ]+$/;
    if (!validFilenameRegex.test(filename)) {
        throw new Error('Filename contains invalid characters');
    }

    return true;
}

/**
 * Generate secure random filename
 */
export function generateSecureFilename(originalName) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const extension = originalName.split('.').pop().toLowerCase();
    
    // Validate extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!allowedExtensions.includes(extension)) {
        throw new Error(`Invalid file extension: ${extension}`);
    }

    return `${timestamp}_${randomString}.${extension}`;
}

/**
 * Validate Base64 image string
 */
export function validateBase64Image(base64String) {
    try {
        // Check if string is valid base64
        const matches = base64String.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
        
        if (!matches) {
            throw new Error('Invalid base64 image format');
        }

        const mimeType = `image/${matches[1]}`;
        const base64Data = matches[2];

        // Validate MIME type
        validateMimeType(mimeType);

        // Decode base64 to get actual size
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Validate size
        validateFileSize(buffer.length);

        // Validate file signature
        validateFileSignature(buffer, mimeType);

        // Scan for malicious content
        scanForMaliciousContent(buffer);

        return {
            valid: true,
            mimeType,
            size: buffer.length,
            buffer
        };
    } catch (error) {
        throw new Error(`Base64 image validation failed: ${error.message}`);
    }
}

/**
 * Middleware to validate file uploads
 */
export function secureFileUpload(req, res, next) {
    try {
        // Check if request contains file data
        if (req.files || req.file) {
            // Handle multipart form data (if using multer or similar)
            const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];
            
            let totalSize = 0;

            for (const file of files) {
                if (!file) continue;

                // Validate file size
                validateFileSize(file.size);
                totalSize += file.size;

                // Validate MIME type
                validateMimeType(file.mimetype);

                // Validate filename
                validateFilename(file.originalname);

                // Read file buffer for signature validation
                if (file.buffer) {
                    validateFileSignature(file.buffer, file.mimetype);
                    scanForMaliciousContent(file.buffer);
                }

                // Generate secure filename
                file.secureFilename = generateSecureFilename(file.originalname);
            }

            // Check total upload size
            if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
                return res.status(413).json({
                    success: false,
                    message: `Total upload size exceeds maximum of ${MAX_TOTAL_UPLOAD_SIZE / 1024 / 1024}MB`
                });
            }
        }

        // Check for base64 images in request body
        if (req.body) {
            // Check for images array
            if (req.body.images && Array.isArray(req.body.images)) {
                for (const image of req.body.images) {
                    if (typeof image === 'string' && image.startsWith('data:image')) {
                        validateBase64Image(image);
                    }
                }
            }

            // Check for single image field
            if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image')) {
                validateBase64Image(req.body.image);
            }

            // Check nested objects (like companyOverview.images)
            if (req.body.companyOverview?.images && Array.isArray(req.body.companyOverview.images)) {
                for (const image of req.body.companyOverview.images) {
                    if (typeof image === 'string' && image.startsWith('data:image')) {
                        validateBase64Image(image);
                    }
                }
            }

            // Check team member images
            if (req.body.teamMembers && Array.isArray(req.body.teamMembers)) {
                for (const member of req.body.teamMembers) {
                    if (member.image && typeof member.image === 'string' && member.image.startsWith('data:image')) {
                        validateBase64Image(member.image);
                    }
                }
            }
        }

        console.log('[FILE SECURITY] File upload validation passed');
        next();
    } catch (error) {
        console.error('[FILE SECURITY] File upload validation failed:', error.message);
        console.error('[FILE SECURITY] IP:', req.ip);
        console.error('[FILE SECURITY] URL:', req.originalUrl);
        
        return res.status(400).json({
            success: false,
            message: error.message,
            code: 'FILE_VALIDATION_FAILED'
        });
    }
}

/**
 * Strip EXIF data from images (metadata that could contain sensitive info)
 */
export function stripExifData(buffer) {
    // For JPEG files, EXIF data is between 0xFFE1 marker
    // This is a simple implementation - in production, use a library like 'exif-remover'
    try {
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) { // JPEG signature
            let i = 2;
            while (i < buffer.length - 1) {
                if (buffer[i] === 0xFF) {
                    if (buffer[i + 1] === 0xE1) { // EXIF marker
                        // Get segment length
                        const length = (buffer[i + 2] << 8) + buffer[i + 3];
                        // Remove EXIF segment
                        const newBuffer = Buffer.concat([
                            buffer.slice(0, i),
                            buffer.slice(i + length + 2)
                        ]);
                        return newBuffer;
                    }
                    i += 2;
                } else {
                    i++;
                }
            }
        }
        return buffer; // Return original if no EXIF found or not JPEG
    } catch (error) {
        console.error('Error stripping EXIF data:', error);
        return buffer; // Return original on error
    }
}

export default {
    validateFileSize,
    validateMimeType,
    validateFileSignature,
    scanForMaliciousContent,
    validateFilename,
    generateSecureFilename,
    validateBase64Image,
    secureFileUpload,
    stripExifData,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
    MAX_TOTAL_UPLOAD_SIZE
};