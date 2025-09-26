/*import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config()
export function createUser(req, res) {

    const newUserData = req.body

    if (newUserData.type == "admin") {

        if (req.user == null) {
            res.json({
                message: "complete the admin details"
            })
            return
        }

        if (req.user.type != "admin") {
            res.json({
                message: "Please login as administrator to create admin accounts"
            })
            return
        }

    }

    newUserData.password = bcrypt.hashSync(newUserData.password, 10)

    const user = new User(newUserData)

    user.save().then(() => {
        res.json({
            message: "User created"
        })
    }).catch((err) => {
        res.json({
            message: "User not created"
        })
    })

}

export function loginUser(req, res) {
    console.log(req.body)

    User.find({ email: req.body.email }).then(
        (users) => {
            if (users.length == 0) {

                res.json({
                    message: "User not found"
                })

            } else {

                const user = users[0]

                const isPasswordCorrect = bcrypt.compareSync(req.body.password, user.password)

                if (isPasswordCorrect) {

                    const token = jwt.sign({
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress

                    }, process.env.SECRET)

                    res.json({
                        message: "User logged in",
                        token: token,
                        user: {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            type: user.type,
                            email: user.email,
                            phonenumber: user.phonenumber,
                            homeaddress: user.homeaddress

                        }

                    })
                    console.log(token)

                } else {
                    res.json({
                        message: "User not logged in (wrong password)"
                    })
                }
            }
        }
    )
}

export function isAdmin(req) {
    if (req.user == null) {
        return false
    }

    if (req.user.type != "admin") {
        return false
    }

    return true
}

export function isCustomer(req) {
    if (req.user == null) {
        return false
    }

    if (req.user.type != "customer") {
        return false
    }

    return true
}*/

/*import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config()

export function createUser(req, res) {
    const newUserData = req.body
    
    // Validate required fields for customer registration
    if (!newUserData.firstName || !newUserData.phonenumber || !newUserData.homeaddress) {
        return res.status(400).json({
            message: "First name, phone number, and home address are required"
        })
    }
    
    // Check if user already exists with this phone number
    User.find({ phonenumber: newUserData.phonenumber }).then(
        async (existingUsers) => {
            if (existingUsers.length > 0) {
                return res.status(409).json({
                    message: "User with this phone number already exists"
                })
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
                
                // Add userId to user data
                newUserData.userId = userId;
                
                // Admin creation logic (if needed)
                if (newUserData.type == "admin") {
                    if (req.user == null) {
                        return res.status(401).json({
                            message: "Complete the admin details"
                        })
                    }
                    if (req.user.type != "admin") {
                        return res.status(403).json({
                            message: "Please login as administrator to create admin accounts"
                        })
                    }
                    // For admin, you might still want to hash a password if provided
                    if (newUserData.password) {
                        newUserData.password = bcrypt.hashSync(newUserData.password, 10)
                    }
                } else {
                    // For customers, set type to customer and hash phone number as password
                    newUserData.type = "customer"
                    newUserData.password = bcrypt.hashSync(newUserData.phonenumber, 10)
                }
                
                const user = new User(newUserData)
                await user.save()
                
                // Generate token immediately after user creation
                const token = jwt.sign({
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName || "",
                    type: user.type,
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress || ""
                }, process.env.SECRET)
                
                res.status(201).json({
                    message: "User created successfully",
                    token: token,
                    user: {
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName || "",
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress || ""
                    }
                })
            } catch (err) {
                console.error("Error creating user:", err)
                res.status(500).json({
                    message: "User not created",
                    error: err.message
                })
            }
        }
    ).catch((err) => {
        console.error("Error checking existing user:", err)
        res.status(500).json({
            message: "Error checking user existence",
            error: err.message
        })
    })
}

export function loginUser(req, res) {
    console.log(req.body)
    
    // Validate required fields
    if (!req.body.firstName || !req.body.phonenumber) {
        return res.status(400).json({
            message: "First name and phone number are required"
        })
    }
    
    // Find user by first name and phone number
    User.find({ 
        firstName: req.body.firstName,
        phonenumber: req.body.phonenumber 
    }).then(
        (users) => {
            if (users.length == 0) {
                return res.status(404).json({
                    message: "User not found"
                })
            } else {
                const user = users[0]
                // Compare phone number with hashed password
                const isPasswordCorrect = bcrypt.compareSync(req.body.phonenumber, user.password)
                
                if (isPasswordCorrect) {
                    const token = jwt.sign({
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName || "",
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress || ""
                    }, process.env.SECRET)
                    
                    res.status(200).json({
                        message: "User logged in successfully",
                        token: token,
                        user: {
                            userId: user.userId,
                            firstName: user.firstName,
                            lastName: user.lastName || "",
                            type: user.type,
                            phonenumber: user.phonenumber,
                            homeaddress: user.homeaddress || ""
                        }
                    })
                    console.log(token)
                } else {
                    res.status(401).json({
                        message: "Invalid credentials"
                    })
                }
            }
        }
    ).catch((err) => {
        console.error("Error during login:", err)
        res.status(500).json({
            message: "Login failed",
            error: err.message
        })
    })
}

export function isAdmin(req) {
    if (req.user == null) {
        return false
    }
    if (req.user.type != "admin") {
        return false
    }
    return true
}

export function isCustomer(req) {
    if (req.user == null) {
        return false
    }
    if (req.user.type != "customer") {
        return false
    }
    return true
}

// Add this function to your user controller (userController.js)

export function checkAccountExists(req, res) {
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
                    lastName: user.lastName || "",
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress || ""
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

// Don't forget to add this route to your routes file:
// router.post("/check-account", checkAccountExists);*/

import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config()

export function createUser(req, res) {
    const newUserData = req.body
    
    // Validate required fields for customer registration
    if (!newUserData.firstName || !newUserData.phonenumber || !newUserData.homeaddress) {
        return res.status(400).json({
            message: "First name, phone number, and home address are required"
        })
    }
    
    // Check if user already exists with this phone number
    User.find({ phonenumber: newUserData.phonenumber }).then(
        async (existingUsers) => {
            if (existingUsers.length > 0) {
                return res.status(409).json({
                    message: "User with this phone number already exists"
                })
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
                
                // Add userId to user data
                newUserData.userId = userId;
                
                // Admin creation logic (if needed)
                if (newUserData.type == "admin") {
                    if (req.user == null) {
                        return res.status(401).json({
                            message: "Complete the admin details"
                        })
                    }
                    if (req.user.type != "admin") {
                        return res.status(403).json({
                            message: "Please login as administrator to create admin accounts"
                        })
                    }
                    // For admin, you might still want to hash a password if provided
                    if (newUserData.password) {
                        newUserData.password = bcrypt.hashSync(newUserData.password, 10)
                    }
                } else {
                    // For customers, set type to customer and hash phone number as password
                    newUserData.type = "customer"
                    newUserData.password = bcrypt.hashSync(newUserData.phonenumber, 10)
                }
                
                const user = new User(newUserData)
                await user.save()
                
                // FIXED: Generate token using process.env.JWT_SECRET instead of process.env.SECRET
                const token = jwt.sign({
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName || "",
                    type: user.type,
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress || ""
                }, process.env.JWT_SECRET)
                
                res.status(201).json({
                    message: "User created successfully",
                    token: token,
                    user: {
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName || "",
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress || ""
                    }
                })
            } catch (err) {
                console.error("Error creating user:", err)
                res.status(500).json({
                    message: "User not created",
                    error: err.message
                })
            }
        }
    ).catch((err) => {
        console.error("Error checking existing user:", err)
        res.status(500).json({
            message: "Error checking user existence",
            error: err.message
        })
    })
}

export function loginUser(req, res) {
    console.log("Login request:", req.body)
    
    // Validate required fields
    if (!req.body.firstName || !req.body.phonenumber) {
        return res.status(400).json({
            message: "First name and phone number are required"
        })
    }
    
    // Find user by first name and phone number
    User.findOne({ 
        firstName: req.body.firstName,
        phonenumber: req.body.phonenumber 
    }).then(
        (user) => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                })
            }
            
            // Compare phone number with hashed password
            const isPasswordCorrect = bcrypt.compareSync(req.body.phonenumber, user.password)
            
            if (isPasswordCorrect) {
                // FIXED: Generate token using process.env.JWT_SECRET instead of process.env.SECRET
                const token = jwt.sign({
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName || "",
                    type: user.type,
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress || ""
                }, process.env.JWT_SECRET)
                
                res.status(200).json({
                    message: "User logged in successfully",
                    token: token,
                    user: {
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName || "",
                        type: user.type,
                        phonenumber: user.phonenumber,
                        homeaddress: user.homeaddress || ""
                    }
                })
                console.log("Login successful, token:", token)
            } else {
                res.status(401).json({
                    message: "Invalid credentials"
                })
            }
        }
    ).catch((err) => {
        console.error("Error during login:", err)
        res.status(500).json({
            message: "Login failed",
            error: err.message
        })
    })
}

// Enhanced function to check account existence
export function checkAccountExists(req, res) {
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
                    lastName: user.lastName || "",
                    phonenumber: user.phonenumber,
                    homeaddress: user.homeaddress || ""
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

// New function for automatic login/registration during checkout
export function loginOrRegister(req, res) {
    const { firstName, lastName, phonenumber, homeaddress } = req.body;
    
    // Validate required fields
    if (!firstName || !phonenumber || !homeaddress) {
        return res.status(400).json({
            success: false,
            message: "First name, phone number, and home address are required"
        });
    }
    
    // First, try to find existing user
    User.findOne({ 
        firstName: firstName.trim(),
        phonenumber: phonenumber.trim() 
    }).then(async (existingUser) => {
        if (existingUser) {
            // User exists, generate token and return
            const token = jwt.sign({
                userId: existingUser.userId,
                firstName: existingUser.firstName,
                lastName: existingUser.lastName || "",
                type: existingUser.type,
                phonenumber: existingUser.phonenumber,
                homeaddress: existingUser.homeaddress || ""
            }, process.env.SECRET);
            
            return res.json({
                success: true,
                isNewUser: false,
                message: "User logged in successfully",
                token: token,
                user: {
                    userId: existingUser.userId,
                    firstName: existingUser.firstName,
                    lastName: existingUser.lastName || "",
                    type: existingUser.type,
                    phonenumber: existingUser.phonenumber,
                    homeaddress: existingUser.homeaddress || ""
                }
            });
        } else {
            // User doesn't exist, create new account
            try {
                // Check if phone number is already used by another user
                const phoneCheck = await User.findOne({ phonenumber: phonenumber.trim() });
                if (phoneCheck) {
                    return res.status(409).json({
                        success: false,
                        message: "Phone number already exists with different name"
                    });
                }
                
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
                
                // Create new user
                const newUser = new User({
                    userId: userId,
                    firstName: firstName.trim(),
                    lastName: lastName ? lastName.trim() : "",
                    phonenumber: phonenumber.trim(),
                    homeaddress: homeaddress.trim(),
                    type: "customer",
                    password: bcrypt.hashSync(phonenumber.trim(), 10)
                });
                
                await newUser.save();
                
                // Generate token for new user
                const token = jwt.sign({
                    userId: newUser.userId,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName || "",
                    type: newUser.type,
                    phonenumber: newUser.phonenumber,
                    homeaddress: newUser.homeaddress || ""
                }, process.env.SECRET);
                
                res.status(201).json({
                    success: true,
                    isNewUser: true,
                    message: "User created successfully",
                    token: token,
                    user: {
                        userId: newUser.userId,
                        firstName: newUser.firstName,
                        lastName: newUser.lastName || "",
                        type: newUser.type,
                        phonenumber: newUser.phonenumber,
                        homeaddress: newUser.homeaddress || ""
                    }
                });
            } catch (error) {
                console.error("Error creating user:", error);
                res.status(500).json({
                    success: false,
                    message: "Failed to create user account",
                    error: error.message
                });
            }
        }
    }).catch((error) => {
        console.error("Error in loginOrRegister:", error);
        res.status(500).json({
            success: false,
            message: "Authentication failed",
            error: error.message
        });
    });
}

export function isAdmin(req) {
    if (req.user == null) {
        return false
    }
    if (req.user.type != "admin") {
        return false
    }
    return true
}

export function isCustomer(req) {
    if (req.user == null) {
        return false
    }
    if (req.user.type != "customer") {
        return false
    }
    return true
}