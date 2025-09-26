/*import express from "express";
import { createUser,  loginUser,   } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/", createUser)
userRouter.post("/login",loginUser)




export default userRouter*/

/*import express from "express";
import { checkAccountExists, createUser, loginOrRegister, loginUser } from "../controllers/userController.js";
import { getMyOrders, getOrderById } from "../controllers/orderController.js";


const userRouter = express.Router();

// User authentication routes
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);

userRouter.post("/login-or-register", loginOrRegister); // New route for checkout

userRouter.post("/check-account", checkAccountExists);

// My Orders routes (protected)
userRouter.get("/my-orders",  getMyOrders);
userRouter.get("/my-orders/:orderId",  getOrderById);

export default userRouter;*/

import express from "express";
import { checkAccountExists, createUser, loginOrRegister, loginUser } from "../controllers/userController.js";
import { getMyOrders, getOrderById } from "../controllers/orderController.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const userRouter = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access token is required"
        });
    }

    jwt.verify(token, process.env.SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired token"
            });
        }
        req.user = user;
        next();
    });
};

// User authentication routes (public)
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/login-or-register", loginOrRegister);
userRouter.post("/check-account", checkAccountExists);

// My Orders routes (protected - require authentication)
userRouter.get("/my-orders", authenticateToken, getMyOrders);
userRouter.get("/my-orders/:orderId", authenticateToken, getOrderById);

export default userRouter;