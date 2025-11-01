// controllers/adminUserController.js
import User from '../models/user.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Admin audit logging
function auditAdminAction(req, action) {
    console.log(`[ADMIN AUDIT] ${new Date().toISOString()} - Admin: ${req.user?.userId} - Action: ${action}`);
}

/**
 * Admin login endpoint
 */
export async function loginAdmin(req, res) {
    try {
        const { phonenumber, password } = req.body;

        if (!phonenumber || !password) {
            return res.status(400).json({
                success: false,
                message: "Phone number and password are required"
            });
        }

        const user = await User.findOne({ 
            phonenumber: phonenumber.trim(),
            type: 'admin'
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign({
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            type: user.type,
            phonenumber: user.phonenumber,
            homeaddress: user.homeaddress
        }, process.env.SECRET, { expiresIn: '24h' });

        auditAdminAction({
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                timestamp: new Date()
            }
        }, 'ADMIN_LOGIN');

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
 * Get all customer accounts - Only accessible by admins
 */
export async function getAllCustomers(req, res) {
    try {
        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Only admins can view customer accounts"
            });
        }

        const customers = await User.find({ type: 'customer' }).select('-password');

        auditAdminAction(req, 'VIEW_ALL_CUSTOMERS');

        res.status(200).json({
            success: true,
            count: customers.length,
            customers: customers
        });

    } catch (error) {
        console.error("Error fetching customer accounts:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customer accounts",
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

        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        const user = await User.findOne({ userId: req.user.userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        auditAdminAction(req, 'PASSWORD_CHANGE');

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update password",
            error: error.message
        });
    }
}

/**
 * Create a new admin user - Only accessible by admins
 */
export async function createAdminUser(req, res) {
    try {
        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Only admins can create admin accounts"
            });
        }

        const { firstName, lastName, phonenumber, homeaddress, password } = req.body;

        if (!firstName || !phonenumber || !homeaddress || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingUser = await User.findOne({ phonenumber: phonenumber.trim() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Phone number already registered"
            });
        }

        const adminCount = await User.countDocuments({ type: 'admin' });
        const userId = `ADM${String(adminCount + 1).padStart(3, '0')}`;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new User({
            userId: userId,
            firstName: firstName.trim(),
            lastName: lastName ? lastName.trim() : "",
            phonenumber: phonenumber.trim(),
            homeaddress: homeaddress.trim(),
            type: 'admin',
            password: hashedPassword
        });

        await newAdmin.save();

        auditAdminAction(req, `CREATE_ADMIN_USER: ${userId}`);

        res.status(201).json({
            success: true,
            message: "Admin user created successfully",
            admin: {
                userId: newAdmin.userId,
                firstName: newAdmin.firstName,
                lastName: newAdmin.lastName,
                phonenumber: newAdmin.phonenumber,
                homeaddress: newAdmin.homeaddress,
                type: newAdmin.type
            }
        });

    } catch (error) {
        console.error("Error creating admin user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create admin user",
            error: error.message
        });
    }
}

/**
 * Delete an admin user - Only accessible by admins
 */
export async function deleteAdminUser(req, res) {
    try {
        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Only admins can delete admin accounts"
            });
        }

        const { userId } = req.params;

        if (req.user.userId === userId) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }

        const user = await User.findOne({ userId, type: 'admin' });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Admin user not found"
            });
        }

        await User.deleteOne({ userId });

        auditAdminAction(req, `DELETE_ADMIN_USER: ${userId}`);

        res.status(200).json({
            success: true,
            message: "Admin user deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting admin user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete admin user",
            error: error.message
        });
    }
}