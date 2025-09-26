import jwt from 'jsonwebtoken';
import User from '../models/user.js';

export async function authenticateToken(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        console.log("Auth header received:", authHeader); // Debug log
        
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            console.log("No token provided in request"); // Debug log
            return res.status(401).json({
                success: false,
                message: "Access token required"
            });
        }

        console.log("Token received:", token.substring(0, 20) + "..."); // Debug log (partial token)

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token decoded successfully:", { userId: decoded.userId, firstName: decoded.firstName }); // Debug log
        
        // Optional: Verify user still exists in database
        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            console.log("User not found in database:", decoded.userId); // Debug log
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("User found in database:", user.firstName, user.lastName); // Debug log

        // Add user info to request object
        req.user = {
            userId: decoded.userId,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            phonenumber: decoded.phonenumber,
            type: decoded.type || user.type
        };

        console.log("Authentication successful for user:", req.user.userId); // Debug log
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
                error: "Token is malformed or corrupted"
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired",
                error: "Please log in again"
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

