// controllers/adminUserController.js
import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { validatePassword } from "../utils/passwordValidator.js";
import { auditAdminAction, logSecurityEvent } from "../middleware/adminAuth.js";

dotenv.config();

/**
 * Create admin account - Only accessible by existing admins
 * Enforces strong password policy
 */
export async function createAdminAccount(req, res) {
    try {
        // Verify requester is admin
        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Only admins can create admin accounts"
            });
        }

        const { firstName, lastName, phonenumber, homeaddress, password } = req.body;

        // Validate required fields
        if (!firstName || !phonenumber || !homeaddress || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: firstName, phonenumber, homeaddress, password"
            });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Password does not meet security requirements",
                errors: passwordValidation.errors
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ phonenumber: phonenumber.trim() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this phone number already exists"
            });
        }

        // Generate unique userId
        const userId = firstName.trim().toLowerCase() + "-" + Date.now();

        // Create admin user with strong password hashing (12 rounds)
        const hashedPassword = await bcrypt.hash(password, 12);

        const adminUser = new User({
            userId,
            firstName: firstName.trim(),
            lastName: lastName ? lastName.trim() : "",
            phonenumber: phonenumber.trim(),
            homeaddress: homeaddress.trim(),
            type: "admin",
            password: hashedPassword
        });

        await adminUser.save();

        // Audit log
        auditAdminAction(req, 'CREATE_ADMIN_ACCOUNT', adminUser.userId);
        
        logSecurityEvent('ADMIN_ACCOUNT_CREATED', {
            createdBy: req.user.userId,
            createdByName: `${req.user.firstName} ${req.user.lastName}`,
            newAdminUserId: adminUser.userId,
            newAdminName: `${adminUser.firstName} ${adminUser.lastName}`,
            timestamp: new Date()
        });

        // Don't send the password back
        res.status(201).json({
            success: true,
            message: "Admin account created successfully",
            admin: {
                userId: adminUser.userId,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
                phonenumber: adminUser.phonenumber,
                homeaddress: adminUser.homeaddress,
                type: adminUser.type
            }
        });

    } catch (error) {
        console.error("Error creating admin account:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create admin account",
            error: error.message
        });
    }
}

/**
 * Admin login with strong authentication
 * Includes account lockout after failed attempts
 */
export async function adminLogin(req, res) {
    try {
        const { phonenumber, password } = req.body;

        // Validate required fields
        if (!phonenumber || !password) {
            return res.status(400).json({
                success: false,
                message: "Phone number and password are required"
            });
        }

        // Check for account lockout
        const { checkAccountLockout, recordFailedLogin, clearFailedAttempts } = await import('../middleware/adminAuth.js');
        const lockoutStatus = checkAccountLockout(phonenumber);
        
        if (lockoutStatus.locked) {
            logSecurityEvent('ADMIN_LOGIN_ATTEMPT_WHILE_LOCKED', {
                phonenumber,
                remainingMinutes: lockoutStatus.remainingMinutes,
                timestamp: new Date()
            });
            
            return res.status(429).json({
                success: false,
                message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockoutStatus.remainingMinutes} minutes.`
            });
        }

        // Find admin user
        const user = await User.findOne({ 
            phonenumber: phonenumber.trim(),
            type: "admin" 
        });

        if (!user) {
            recordFailedLogin(phonenumber);
            
            logSecurityEvent('FAILED_ADMIN_LOGIN_ATTEMPT', {
                phonenumber,
                reason: 'User not found or not admin',
                timestamp: new Date()
            });
            
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Verify password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            recordFailedLogin(phonenumber);
            
            logSecurityEvent('FAILED_ADMIN_LOGIN_ATTEMPT', {
                userId: user.userId,
                phonenumber,
                reason: 'Incorrect password',
                timestamp: new Date()
            });
            
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Clear failed attempts on successful login
        clearFailedAttempts(phonenumber);

        // Generate JWT token with shorter expiry for admin (4 hours)
        const token = jwt.sign({
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            type: user.type,
            phonenumber: user.phonenumber,
            homeaddress: user.homeaddress
        }, process.env.SECRET, { expiresIn: '4h' });

        // Log successful admin login
        logSecurityEvent('ADMIN_LOGIN_SUCCESS', {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            timestamp: new Date()
        });

        res.status(200).json({
            success: true,
            message: "Admin login successful",
            token: token,
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                type: user.type,
                phonenumber: user.phonenumber,
                homeaddress: user.homeaddress
            }
        });

    } catch (error) {
        console.error("Error during admin login:", error);
        res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message
        });
    }
}

/**
 * Get all admin users - Only accessible by admins
 */
export async function getAllAdmins(req, res) {
    try {
        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Only admins can view admin accounts"
            });
        }

        const admins = await User.find({ type: 'admin' }).select('-password');

        auditAdminAction(req, 'VIEW_ALL_ADMINS');

        res.status(200).json({
            success: true,
            count: admins.length,
            admins: admins
        });

    } catch (error) {
        console.error("Error fetching admin users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin users",
            error: error.message
        });
    }
}

/**
 * Update admin password - Admin can only update their own password
 */
export async function updateAdminPassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: "New password does not meet security requirements",
                errors: passwordValidation.errors
            });
        }

        // Get current user
        const user = await User.findOne({ userId: req.user.userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verify current password
        const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordCorrect) {
            logSecurityEvent('FAILED_PASSWORD_CHANGE', {
                userId: user.userId,
                reason: 'Incorrect current password',
                timestamp: new Date()
            });
            
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedNewPassword;
        await user.save();

        logSecurityEvent('ADMIN_PASSWORD_CHANGED', {
            userId: user.userId,
            userName: `${user.firstName} ${user.lastName}`,
            timestamp: new Date()
        });

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Error updating admin password:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update password",
            error: error.message
        });
    }
}

/**
 * Delete admin account - Only superadmin or same user
 */
export async function deleteAdminAccount(req, res) {
    try {
        const { adminId } = req.params;

        // Prevent deleting own account
        if (req.user.userId === adminId) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own admin account"
            });
        }

        const adminToDelete = await User.findOne({ userId: adminId, type: 'admin' });
        if (!adminToDelete) {
            return res.status(404).json({
                success: false,
                message: "Admin account not found"
            });
        }

        await User.deleteOne({ userId: adminId });

        auditAdminAction(req, 'DELETE_ADMIN_ACCOUNT', adminId);
        
        logSecurityEvent('ADMIN_ACCOUNT_DELETED', {
            deletedBy: req.user.userId,
            deletedByName: `${req.user.firstName} ${req.user.lastName}`,
            deletedAdminId: adminToDelete.userId,
            deletedAdminName: `${adminToDelete.firstName} ${adminToDelete.lastName}`,
            timestamp: new Date()
        });

        res.status(200).json({
            success: true,
            message: "Admin account deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting admin account:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete admin account",
            error: error.message
        });
    }
}