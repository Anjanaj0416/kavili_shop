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
                        homeaddress: user.homeaddress,
                        email: user.email
                    }, process.env.SECRET, { expiresIn: '24h' });
                    
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
                            homeaddress: user.homeaddress,
                            email: user.email
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
                        userId: Math.random().toString(36).substr(2, 9),
                        firstName: firstName.trim(),
                        lastName: lastName ? lastName.trim() : "",
                        phonenumber: phonenumber.trim(),
                        homeaddress: homeaddress ? homeaddress.trim() : "",
                        password: hashedPhoneNumber,
                        type: "customer",
                        email: email && email.trim() ? email.trim() : null
                    });
                    
                    newUser.save()
                        .then((savedUser) => {
                            const token = jwt.sign({
                                userId: savedUser.userId,
                                firstName: savedUser.firstName,
                                lastName: savedUser.lastName,
                                type: savedUser.type,
                                phonenumber: savedUser.phonenumber,
                                homeaddress: savedUser.homeaddress,
                                email: savedUser.email
                            }, process.env.SECRET, { expiresIn: '24h' });
                            
                            res.status(201).json({
                                success: true,
                                message: "Account created and logged in successfully",
                                isNewUser: true,
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
                            res.status(500).json({
                                success: false,
                                message: "Failed to create account",
                                error: error.message
                            });
                        });
                } catch (error) {
                    console.error("Error in registration:", error);
                    res.status(500).json({
                        success: false,
                        message: "Registration failed",
                        error: error.message
                    });
                }
            }
        })
        .catch((error) => {
            console.error("Error checking user:", error);
            res.status(500).json({
                success: false,
                message: "Database error",
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
                    homeaddress: user.homeaddress,
                    email: user.email
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

// Login function (legacy - when user already has account)
export function login(req, res) {
    const credentials = req.body;
    console.log("Login attempt:", credentials);

    if (!credentials.firstName || !credentials.phonenumber) {
        return res.status(400).json({
            success: false,
            message: "First name and phone number are required"
        });
    }

    User.findOne({ firstName: credentials.firstName }).then(
        (user) => {
            if (user == null) {
                res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            } else {
                const isPasswordCorrect = bcrypt.compareSync(credentials.phonenumber, user.password);
                
                if (isPasswordCorrect) {
                    const token = jwt.sign({
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress,
                        email: user.email
                    }, process.env.SECRET);
                    
                    res.json({
                        success: true,
                        message: "User found",
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

    // Email validation (if provided)
    if (newUserData.email && newUserData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUserData.email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }
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
                
                // Create new user data with optional email field
                const userData = {
                    userId: userId,
                    firstName: newUserData.firstName.trim(),
                    lastName: newUserData.lastName ? newUserData.lastName.trim() : "",
                    phonenumber: newUserData.phonenumber.trim(),
                    homeaddress: newUserData.homeaddress.trim(),
                    type: newUserData.type || "customer",
                    password: bcrypt.hashSync(newUserData.phonenumber.trim(), 10),
                    email: newUserData.email && newUserData.email.trim() ? newUserData.email.trim() : null
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
                    homeaddress: user.homeaddress,
                    email: user.email
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
                        homeaddress: user.homeaddress,
                        email: user.email
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

export function updateCustomerProfile(req, res) {
    console.log("updateCustomerProfile called");
    console.log("User from token:", req.user);
    console.log("Update data:", req.body);

    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    // Only customers can update their own profile
    if (req.user.type !== 'customer') {
        return res.status(403).json({
            success: false,
            message: "Only customers can update their profile"
        });
    }

    const { firstName, lastName, homeaddress, email } = req.body;

    // Validate required fields
    if (!firstName || !firstName.trim()) {
        return res.status(400).json({
            success: false,
            message: "First name is required"
        });
    }

    if (!homeaddress || !homeaddress.trim()) {
        return res.status(400).json({
            success: false,
            message: "Home address is required"
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

    // Find and update user
    User.findOne({ userId: req.user.userId })
        .then(async (user) => {
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Update user fields
            user.firstName = firstName.trim();
            user.lastName = lastName ? lastName.trim() : "";
            user.homeaddress = homeaddress.trim();
            user.email = email && email.trim() ? email.trim() : null;

            await user.save();

            // Generate new token with updated information
            const token = jwt.sign({
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                type: user.type,
                phonenumber: user.phonenumber,
                homeaddress: user.homeaddress,
                email: user.email
            }, process.env.SECRET);

            console.log("Profile updated successfully for user:", user.userId);

            res.json({
                success: true,
                message: "Profile updated successfully",
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

// Add this function to your controllers/userController.js file

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
            
            // Generate a unique userId
            User.countDocuments({}).then((count) => {
                const newUserId = count + 1;
                
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
                        console.error("Error saving user:", error);
                        
                        if (error.code === 11000) {
                            return res.status(409).json({
                                success: false,
                                message: "User with this phone number or email already exists"
                            });
                        }
                        
                        res.status(500).json({
                            success: false,
                            message: "Registration failed",
                            error: error.message
                        });
                    });
            }).catch((error) => {
                console.error("Error counting users:", error);
                res.status(500).json({
                    success: false,
                    message: "Registration failed",
                    error: error.message
                });
            });
        }
    }).catch((error) => {
        console.error("Error checking existing user:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    });
}