// routes/userRouter.js - UPDATED VERSION WITH UNIFIED SOCIAL AUTH
import express from "express";
import { 
    checkAccountExists, 
    createUser, 
    loginOrRegister, 
    loginUser, 
    updateCustomerProfile, 
    socialRegister,  // New unified social registration
    socialLogin      // New unified social login
} from "../controllers/userController.js";
import { getMyOrders, getOrderById } from "../controllers/orderController.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkUserByPhone } from '../controllers/userController.js';

import dotenv from "dotenv";

dotenv.config();

const userRouter = express.Router();

// User authentication routes (public)
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/login-or-register", loginOrRegister);
userRouter.post("/check-account", checkAccountExists);

// Unified social authentication routes (Google & Facebook)
userRouter.post("/social-register", socialRegister);  // Replaces google-register
userRouter.post("/social-login", socialLogin);        // Replaces google-login
userRouter.post('/check-user-by-phone', checkUserByPhone);

// Profile management routes (protected - require authentication)
userRouter.put("/profile", authenticateToken, updateCustomerProfile);

// My Orders routes (protected - require authentication)
userRouter.get("/my-orders", authenticateToken, getMyOrders);
userRouter.get("/my-orders/:orderId", authenticateToken, getOrderById);

export default userRouter;