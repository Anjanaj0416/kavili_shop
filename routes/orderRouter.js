// routes/orderRouter.js - COMPLETE FIXED VERSION WITH ADMIN AUTH
import express from 'express';
import { 
    createOrder, 
    deleteOrder, 
    getOrders, 
    getQuote, 
    updateOrderStatus, 
    getProductOrderStats,
    getMyOrders,
    getOrderById
} from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';

const orderRouter = express.Router();

// PUBLIC ROUTES (no authentication required)
orderRouter.post("/quote", getQuote);

// CUSTOMER ROUTES (require user authentication)
// Order matters - more specific routes first to avoid conflicts!
orderRouter.get("/my-orders", authenticateToken, getMyOrders);
orderRouter.post("/", authenticateToken, createOrder);

// ADMIN ONLY ROUTES (require admin authentication)
orderRouter.get("/product-stats", adminAuth, getProductOrderStats);
orderRouter.get("/", adminAuth, getOrders); // View all orders (admin only)
orderRouter.put("/:orderId/status", adminAuth, updateOrderStatus);
orderRouter.delete("/:orderId", adminAuth, deleteOrder);

// CUSTOMER ROUTE (with parameter - should be after specific routes)
orderRouter.get("/:orderId", authenticateToken, getOrderById);

export default orderRouter;