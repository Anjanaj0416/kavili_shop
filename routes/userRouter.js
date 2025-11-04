// routes/userRouter.js - UPDATED VERSION WITH GOOGLE LOGIN
import express from "express";
import { 
    checkAccountExists, 
    createUser, 
    loginOrRegister, 
    loginUser, 
    updateCustomerProfile, 
    googleRegister,
    googleLogin  // NEW: Import Google login function
} from "../controllers/userController.js";
import { getMyOrders, getOrderById } from "../controllers/orderController.js";
import { authenticateToken } from "../middleware/auth.js";

import dotenv from "dotenv";

dotenv.config();

const userRouter = express.Router();

// User authentication routes (public)
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/login-or-register", loginOrRegister);
userRouter.post("/check-account", checkAccountExists);
userRouter.post("/google-register", googleRegister);
userRouter.post("/google-login", googleLogin);  // NEW: Google login endpoint

// Profile management routes (protected - require authentication)
userRouter.put("/profile", authenticateToken, updateCustomerProfile);

// My Orders routes (protected - require authentication)
userRouter.get("/my-orders", authenticateToken, getMyOrders);
userRouter.get("/my-orders/:orderId", authenticateToken, getOrderById);

export default userRouter;