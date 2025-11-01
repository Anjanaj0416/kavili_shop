// routes/userRouter.js - FIXED VERSION (removes duplicate authenticateToken)
import express from "express";
import { checkAccountExists, createUser, loginOrRegister, loginUser } from "../controllers/userController.js";
import { getMyOrders, getOrderById } from "../controllers/orderController.js";
import { authenticateToken } from "../middleware/auth.js"; // Import from middleware
import dotenv from "dotenv";

dotenv.config();

const userRouter = express.Router();

// User authentication routes (public)
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/login-or-register", loginOrRegister);
userRouter.post("/check-account", checkAccountExists);

// My Orders routes (protected - require authentication)
userRouter.get("/my-orders", authenticateToken, getMyOrders);
userRouter.get("/my-orders/:orderId", authenticateToken, getOrderById);

export default userRouter;