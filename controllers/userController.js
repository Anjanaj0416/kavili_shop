import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
 
dotenv.config();  

function debugModules() {
    console.log('Required modules check:');
    console.log('User model available:', !!User);
    console.log('bcrypt available:', !!bcrypt);
    console.log('jwt available:', !!jwt);
    console.log('SECRET available:', !!process.env.SECRET);
} 

// NEW: Google Login for existing users with email
export function googleLogin(req, res) {
    console.log("googleLogin called with:", req.body);
    
    const { email, googleId, displayName } = req.body;
    
    // Validate required fields
    if (!email || !googleId) {
        return res.status(400).json({
            success: false,
            message: "Email and Google ID are required"
        });
    }

    // Find user by email
    User.findOne({ email: email.trim() }).then(
        (user) => {
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "No account found with this email. Please register first or use traditional login."
                });
            }
            
            // Check if user has an email (required for Google login)
            if (!user.email || user.email.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: "This account doesn't have an email. Please use traditional login with name and phone number."
                });
            }

            // If user exists with email, allow Google login
            // Update Google ID if not already set
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = 'google';
                user.save().catch(err => console.error("Error updating Google ID:", err));
            }

            // Generate JWT token
            const token = jwt.sign({
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                type: user.type,
                phonenumber: user.phonenumber,
                homeaddress: user.homeaddress,
                email: user.email
            }, process.env.SECRET);
            
            res.status(200).json({
                success: true,
                message: "Google login successful",
                token: token,
                user: {
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    type: user.type,
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress,
                    email: user.email
                }
            });
        }
    ).catch((error) => {
        console.error("Error during Google login:", error);
        res.status(500).json({
            success: false,
            message: "Google login failed",
            error: error.message
        });
    });
}

export function loginOrRegister(req, res) {
    console.log("loginOrRegister called with:", req.body);
    
    const { firstName, lastName, phonenumber, homeaddress, email } = req.body;
    
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

    // Email validation (if provided)
    if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }
    }

    // Check if user exists with this first name and phone number
    User.findOne({ firstName: firstName.trim() }).then(
        (user) => {
            if (user) {
                // User exists - verify phone number and log them in
                const isPhoneCorrect = bcrypt.compareSync(phonenumber.trim(), user.password);
                
                if (isPhoneCorrect) {
                    // Generate JWT token
                    const token = jwt.sign({
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress,
                        email: user.email
                    }, process.env.SECRET);
                    
                    res.status(200).json({
                        success: true,
                        message: "Login successful",
                        token: token,
                        isNewUser: false,
                        user: {
                            userId: user.userId,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            type: user.type,
                            phonenumber: user.phonenumber,
                            homeaddress: user.homeaddress,
                            email: user.email
                        }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        message: "Invalid phone number for this account"
                    });
                }
            } else {
                // User doesn't exist - create new user
                console.log("Creating new user via loginOrRegister");
                
                // Hash the phone number to use as password
                const hashedPassword = bcrypt.hashSync(phonenumber.trim(), 10);
                
                // Generate a unique userId in the format USRxxxx
                User.countDocuments({ type: "customer" }).then((count) => {
                    const userNumber = (count + 1).toString().padStart(4, '0');
                    const newUserId = `USR${userNumber}`;
                    
                    const newUser = new User({
                        userId: newUserId,
                        firstName: firstName.trim(),
                        lastName: lastName?.trim() || "",
                        email: email?.trim() || null,
                        phonenumber: phonenumber.trim(),
                        password: hashedPassword,
                        homeaddress: homeaddress?.trim() || "",
                        type: "customer"
                    });
                    
                    newUser.save()
                        .then((savedUser) => {
                            console.log("User created successfully:", savedUser.firstName);
                            
                            // Generate JWT token
                            const token = jwt.sign({
                                userId: savedUser.userId,
                                firstName: savedUser.firstName,
                                lastName: savedUser.lastName,
                                type: savedUser.type,
                                phonenumber: savedUser.phonenumber,
                                homeaddress: savedUser.homeaddress,
                                email: savedUser.email
                            }, process.env.SECRET);
                            
                            res.status(201).json({
                                success: true,
                                message: "User registered successfully",
                                token: token,
                                isNewUser: true,
                                user: {
                                    userId: savedUser.userId,
                                    firstName: savedUser.firstName,
                                    lastName: savedUser.lastName,
                                    type: savedUser.type,
                                    phonenumber: savedUser.phonenumber,
                                    homeaddress: savedUser.homeaddress,
                                    email: savedUser.email
                                }
                            });
                        })
                        .catch((error) => {
                            console.error("Error creating user:", error);
                            res.status(500).json({
                                success: false,
                                message: "Failed to create user",
                                error: error.message
                            });
                        });
                }).catch((error) => {
                    console.error("Error counting users:", error);
                    res.status(500).json({
                        success: false,
                        message: "Failed to generate user ID",
                        error: error.message
                    });
                });
            }
        }
    ).catch((error) => {
        console.error("Error during login or register:", error);
        res.status(500).json({
            success: false,
            message: "Login/Register failed",
            error: error.message
        });
    });
}

export function createUser(req, res) {
    debugModules();
    console.log("createUser called with:", req.body);
    
    const { firstName, lastName, phonenumber, homeaddress, email } = req.body;
    
    // Validate required fields
    if (!firstName || !phonenumber || !homeaddress) {
        return res.status(400).json({
            success: false,
            message: "First name, phone number, and home address are required"
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

    // Email validation (if provided)
    if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }
    }

    // Check if user already exists with this phone number
    User.findOne({ phonenumber: phonenumber.trim() }).then(
        (existingUser) => {
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "User already exists with this phone number. Please login instead."
                });
            }

            // Hash the phone number to use as password
            const hashedPassword = bcrypt.hashSync(phonenumber.trim(), 10);
            
            // Generate a unique userId in the format USRxxxx
            User.countDocuments({ type: "customer" }).then((count) => {
                const userNumber = (count + 1).toString().padStart(4, '0');
                const newUserId = `USR${userNumber}`;
                
                const newUser = new User({
                    userId: newUserId,
                    firstName: firstName.trim(),
                    lastName: lastName?.trim() || "",
                    email: email?.trim() || null,
                    phonenumber: phonenumber.trim(),
                    password: hashedPassword,
                    homeaddress: homeaddress.trim(),
                    type: "customer"
                });
                
                newUser.save()
                    .then((savedUser) => {
                        console.log("User created successfully:", savedUser.firstName);
                        
                        // Generate JWT token
                        const token = jwt.sign({
                            userId: savedUser.userId,
                            firstName: savedUser.firstName,
                            lastName: savedUser.lastName,
                            type: savedUser.type,
                            phonenumber: savedUser.phonenumber,
                            homeaddress: savedUser.homeaddress,
                            email: savedUser.email
                        }, process.env.SECRET);
                        
                        res.status(201).json({
                            success: true,
                            message: "User registered successfully",
                            token: token,
                            user: {
                                userId: savedUser.userId,
                                firstName: savedUser.firstName,
                                lastName: savedUser.lastName,
                                type: savedUser.type,
                                phonenumber: savedUser.phonenumber,
                                homeaddress: savedUser.homeaddress,
                                email: savedUser.email
                            }
                        });
                    })
                    .catch((error) => {
                        console.error("Error creating user:", error);
                        if (error.code === 11000) {
                            res.status(409).json({
                                success: false,
                                message: "User already exists with this phone number"
                            });
                        } else {
                            res.status(500).json({
                                success: false,
                                message: "Failed to create user",
                                error: error.message
                            });
                        }
                    });
            }).catch((error) => {
                console.error("Error counting users:", error);
                res.status(500).json({
                    success: false,
                    message: "Failed to generate user ID",
                    error: error.message
                });
            });
        }
    ).catch((error) => {
        console.error("Error checking existing user:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message
        });
    });
}

// Check if account exists
export function checkAccountExists(req, res) {
    console.log("checkAccountExists called with:", req.body);
    
    const { firstName } = req.body;
    
    if (!firstName) {
        return res.status(400).json({
            success: false,
            message: "First name is required"
        });
    }

    User.findOne({ firstName: firstName.trim() }).then((user) => {
        if (user) {
            res.status(200).json({
                success: true,
                exists: true,
                message: "Account found"
            });
        } else {
            res.status(200).json({
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
                    homeaddress: user.homeaddress,
                    email: user.email
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
                        homeaddress: user.homeaddress,
                        email: user.email
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

// Utility functions for checking user roles
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

// Update customer profile
export function updateCustomerProfile(req, res) {
    console.log("updateCustomerProfile called with:", req.body);
    console.log("User from token:", req.user);

    const { firstName, lastName, homeaddress, email } = req.body;
    const userId = req.user.userId;

    if (!firstName || !homeaddress) {
        return res.status(400).json({
            success: false,
            message: "First name and home address are required"
        });
    }

    // Email validation if provided
    if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }
    }

    User.findOne({ userId: userId })
        .then((user) => {
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Update user fields
            user.firstName = firstName.trim();
            user.lastName = lastName && lastName.trim() ? lastName.trim() : "";
            user.homeaddress = homeaddress.trim();
            user.email = email && email.trim() ? email.trim() : null;

            return user.save();
        })
        .then((updatedUser) => {
            // Generate new token with updated information
            const token = jwt.sign({
                userId: updatedUser.userId,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                type: updatedUser.type,
                phonenumber: updatedUser.phonenumber,
                homeaddress: updatedUser.homeaddress,
                email: updatedUser.email
            }, process.env.SECRET);

            console.log("Profile updated successfully for user:", updatedUser.userId);

            res.json({
                success: true,
                message: "Profile updated successfully",
                token: token,
                user: {
                    userId: updatedUser.userId,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    type: updatedUser.type,
                    phonenumber: updatedUser.phonenumber,
                    homeaddress: updatedUser.homeaddress,
                    email: updatedUser.email
                }
            });
        })
        .catch((error) => {
            console.error("Error updating profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update profile",
                error: error.message
            });
        });
}

// Google registration function - creates user after Google auth
export function googleRegister(req, res) {
    console.log("googleRegister called with:", req.body);
    
    const { firstName, lastName, phonenumber, homeaddress, email, googleId, authProvider } = req.body;
    
    // Validate required fields
    if (!firstName || !phonenumber || !homeaddress || !email || !googleId) {
        return res.status(400).json({
            success: false,
            message: "First name, phone number, home address, email, and Google ID are required"
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
            success: false,
            message: "Invalid email address"
        });
    }

    // Check if user already exists with this Google ID or email
    User.findOne({ 
        $or: [
            { email: email.trim() },
            { googleId: googleId }
        ]
    }).then((existingUser) => {
        if (existingUser) {
            // User already exists - log them in instead
            console.log("User already exists with Google account");
            
            // Check if phone number matches (for security)
            const isPhoneCorrect = bcrypt.compareSync(phonenumber.trim(), existingUser.password);
            
            if (isPhoneCorrect || existingUser.googleId === googleId) {
                // Generate JWT token
                const token = jwt.sign({
                    userId: existingUser.userId,
                    firstName: existingUser.firstName,
                    lastName: existingUser.lastName,
                    type: existingUser.type,
                    phonenumber: existingUser.phonenumber,
                    homeaddress: existingUser.homeaddress,
                    email: existingUser.email
                }, process.env.SECRET);
                
                return res.status(200).json({
                    success: true,
                    message: "User already exists. Logged in successfully.",
                    token: token,
                    isExistingUser: true,
                    user: {
                        userId: existingUser.userId,
                        firstName: existingUser.firstName,
                        lastName: existingUser.lastName,
                        type: existingUser.type,
                        phonenumber: existingUser.phonenumber,
                        homeaddress: existingUser.homeaddress,
                        email: existingUser.email
                    }
                });
            } else {
                return res.status(409).json({
                    success: false,
                    message: "An account with this email already exists with different credentials"
                });
            }
        } else {
            // Create new user with Google authentication
            console.log("Creating new user with Google authentication");
            
            // Hash the phone number to use as password
            const hashedPassword = bcrypt.hashSync(phonenumber.trim(), 10);
            
            // Generate a unique userId in the format USRxxxx
            User.countDocuments({ type: "customer" }).then((count) => {
                const userNumber = (count + 1).toString().padStart(4, '0');
                const newUserId = `USR${userNumber}`;
                
                const newUser = new User({
                    userId: newUserId,
                    firstName: firstName.trim(),
                    lastName: lastName?.trim() || "",
                    email: email.trim(),
                    phonenumber: phonenumber.trim(),
                    password: hashedPassword,
                    homeaddress: homeaddress.trim(),
                    type: "customer",
                    googleId: googleId,
                    authProvider: authProvider || 'google'
                });
                
                newUser.save()
                    .then((savedUser) => {
                        console.log("User created successfully:", savedUser.firstName);
                        
                        // Generate JWT token
                        const token = jwt.sign({
                            userId: savedUser.userId,
                            firstName: savedUser.firstName,
                            lastName: savedUser.lastName,
                            type: savedUser.type,
                            phonenumber: savedUser.phonenumber,
                            homeaddress: savedUser.homeaddress,
                            email: savedUser.email
                        }, process.env.SECRET);
                        
                        res.status(201).json({
                            success: true,
                            message: "User registered successfully with Google",
                            token: token,
                            isNewUser: true,
                            user: {
                                userId: savedUser.userId,
                                firstName: savedUser.firstName,
                                lastName: savedUser.lastName,
                                type: savedUser.type,
                                phonenumber: savedUser.phonenumber,
                                homeaddress: savedUser.homeaddress,
                                email: savedUser.email
                            }
                        });
                    })
                    .catch((error) => {
                        console.error("Error creating user:", error);
                        res.status(500).json({
                            success: false,
                            message: "Failed to create user",
                            error: error.message
                        });
                    });
            }).catch((error) => {
                console.error("Error counting users:", error);
                res.status(500).json({
                    success: false,
                    message: "Failed to generate user ID",
                    error: error.message
                });
            });
        }
    }).catch((error) => {
        console.error("Error during Google registration:", error);
        res.status(500).json({
            success: false,
            message: "Google registration failed",
            error: error.message
        });
    });
}