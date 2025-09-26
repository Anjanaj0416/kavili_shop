console.log('Required modules check:');
console.log('User model available:', !!User);
console.log('bcrypt available:', !!bcrypt);
console.log('jwt available:', !!jwt);
console.log('SECRET available:', !!process.env.SECRET);

import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Function for automatic login/registration during checkout
export function loginOrRegister(req, res) {
    console.log("loginOrRegister called with:", req.body);
    
    const { firstName, lastName, phonenumber, homeaddress } = req.body;
    
    // Validate required fields
    if (!firstName || !phonenumber) {
        return res.status(400).json({
            success: false,
            message: "First name and phone number are required"
        });
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phonenumber.trim())) {
        return res.status(400).json({
            success: false,
            message: "Phone number must be 10 digits"
        });
    }

    // First, check if user exists by firstName
    User.findOne({ firstName: firstName.trim() })
        .then((user) => {
            if (user) {
                // User exists - verify phone number
                const isPhoneCorrect = bcrypt.compareSync(phonenumber.trim(), user.password);
                
                if (isPhoneCorrect) {
                    // Phone number matches - log them in
                    const token = jwt.sign({
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress
                    }, process.env.SECRET, { expiresIn: '24h' }); // Add expiration
                    
                    return res.status(200).json({
                        success: true,
                        message: "Login successful",
                        isNewUser: false,
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
                } else {
                    return res.status(401).json({
                        success: false,
                        message: "Phone number doesn't match existing account"
                    });
                }
            } else {
                // User doesn't exist - create new account
                try {
                    const hashedPhoneNumber = bcrypt.hashSync(phonenumber.trim(), 10);
                    
                    const newUser = new User({
                        userId: Math.random().toString(36).substr(2, 9), // Better ID generation
                        firstName: firstName.trim(),
                        lastName: lastName ? lastName.trim() : "",
                        password: hashedPhoneNumber, // Phone as password
                        type: "customer",
                        phonenumber: phonenumber.trim(),
                        homeaddress: homeaddress ? homeaddress.trim() : ""
                    });

                    return newUser.save().then((savedUser) => {
                        const token = jwt.sign({
                            userId: savedUser.userId,
                            firstName: savedUser.firstName,
                            lastName: savedUser.lastName,
                            type: savedUser.type,
                            phonenumber: savedUser.phonenumber,
                            homeaddress: savedUser.homeaddress
                        }, process.env.SECRET, { expiresIn: '24h' });
                        
                        res.status(201).json({
                            success: true,
                            message: "Account created successfully",
                            isNewUser: true,
                            token: token,
                            user: {
                                userId: savedUser.userId,
                                firstName: savedUser.firstName,
                                lastName: savedUser.lastName,
                                type: savedUser.type,
                                phonenumber: savedUser.phonenumber,
                                homeaddress: savedUser.homeaddress
                            }
                        });
                    }).catch((error) => {
                        console.error("Error creating user:", error);
                        
                        // Handle duplicate key errors
                        if (error.code === 11000) {
                            if (error.keyPattern && error.keyPattern.phonenumber) {
                                return res.status(409).json({
                                    success: false,
                                    message: "Phone number already exists"
                                });
                            }
                            return res.status(409).json({
                                success: false,
                                message: "User already exists"
                            });
                        }
                        
                        return res.status(500).json({
                            success: false,
                            message: "Failed to create account",
                            error: error.message
                        });
                    });
                    
                } catch (error) {
                    console.error("Error in user creation:", error);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to create account",
                        error: error.message
                    });
                }
            }
        })
        .catch((error) => {
            console.error("Database error in loginOrRegister:", error);
            res.status(500).json({
                success: false,
                message: "Authentication failed",
                error: error.message
            });
        });
}

// Check if account exists (for real-time feedback)
export function checkAccountExists(req, res) {
    console.log("checkAccountExists called with:", req.body);
    
    const { firstName, phonenumber } = req.body;
    
    // Validate required fields
    if (!firstName || !phonenumber) {
        return res.status(400).json({
            success: false,
            message: "First name and phone number are required"
        });
    }
    
    // Check if user exists with the provided credentials
    User.findOne({ 
        firstName: firstName.trim(),
        phonenumber: phonenumber.trim() 
    }).then((user) => {
        if (user) {
            // User exists
            res.json({
                success: true,
                exists: true,
                message: "Account found",
                user: {
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress
                }
            });
        } else {
            // User doesn't exist
            res.json({
                success: true,
                exists: false,
                message: "Account not found"
            });
        }
    }).catch((error) => {
        console.error("Error checking account:", error);
        res.status(500).json({
            success: false,
            message: "Error checking account",
            error: error.message
        });
    });
}

// Login function - uses firstName as username and phoneNumber as password
export function loginUser(req, res) {
    console.log("loginUser called with:", req.body);
    
    const { firstName, phonenumber } = req.body;
    
    // Validate required fields
    if (!firstName || !phonenumber) {
        return res.status(400).json({
            success: false,
            message: "First name and phone number are required"
        });
    }
    
    // Find user by first name
    User.findOne({ firstName: firstName.trim() }).then(
        (user) => {
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Account not found with this first name"
                });
            }
            
            // Check if phone number matches (compare with hashed password)
            const isPhoneCorrect = bcrypt.compareSync(phonenumber.trim(), user.password);
            
            if (isPhoneCorrect) {
                // Generate JWT token
                const token = jwt.sign({
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    type: user.type,
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress
                }, process.env.SECRET);
                
                res.status(200).json({
                    success: true,
                    message: "Login successful",
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
            } else {
                res.status(401).json({
                    success: false,
                    message: "Invalid phone number for this account"
                });
            }
        }
    ).catch((error) => {
        console.error("Error during login:", error);
        res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message
        });
    });
}

// Create user function (for manual registration)
export function createUser(req, res) {
    console.log("createUser called with:", req.body);
    
    const newUserData = req.body;
    
    // Validate required fields for customer registration
    if (!newUserData.firstName || !newUserData.phonenumber || !newUserData.homeaddress) {
        return res.status(400).json({
            success: false,
            message: "First name, phone number, and home address are required"
        });
    }
    
    // Check if user already exists with this phone number
    User.findOne({ phonenumber: newUserData.phonenumber }).then(
        async (existingUser) => {
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "User with this phone number already exists"
                });
            }
            
            try {
                // Generate unique user ID
                const latestUser = await User.find().sort({ userId: -1 }).limit(1);
                let userId;
                if (latestUser.length == 0) {
                    userId = "USR0001";
                } else {
                    const currentUserId = latestUser[0].userId;
                    const numberString = currentUserId.replace("USR", "");
                    const number = parseInt(numberString);
                    const newNumber = (number + 1).toString().padStart(4, "0");
                    userId = "USR" + newNumber;
                }
                
                // Create new user data - NO EMAIL FIELD
                const userData = {
                    userId: userId,
                    firstName: newUserData.firstName.trim(),
                    lastName: newUserData.lastName ? newUserData.lastName.trim() : "",
                    phonenumber: newUserData.phonenumber.trim(),
                    homeaddress: newUserData.homeaddress.trim(),
                    type: newUserData.type || "customer",
                    password: bcrypt.hashSync(newUserData.phonenumber.trim(), 10)
                };
                
                const user = new User(userData);
                await user.save();
                
                // Generate JWT token
                const token = jwt.sign({
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    type: user.type,
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress
                }, process.env.SECRET);
                
                res.status(201).json({
                    success: true,
                    message: "User created successfully",
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
                console.error("Error creating user:", error);
                res.status(500).json({
                    success: false,
                    message: "User not created",
                    error: error.message
                });
            }
        }
    ).catch((error) => {
        console.error("Error checking existing user:", error);
        res.status(500).json({
            success: false,
            message: "Error checking user existence",
            error: error.message
        });
    });
}

// Utility functions
export function isAdmin(req) {
    if (req.user == null) {
        return false;
    }
    if (req.user.type != "admin") {
        return false;
    }
    return true;
}

export function isCustomer(req) {
    if (req.user == null) {
        return false;
    }
    if (req.user.type != "customer") {
        return false;
    }
    return true;
}