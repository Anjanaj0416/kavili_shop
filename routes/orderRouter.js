// routes/orderRouter.js - UPDATED VERSION WITH PAYMENT ROUTE
import express from 'express';
import { 
    createOrder, 
    deleteOrder, 
    getOrders, 
    getQuote, 
    updateOrderStatus,
    acceptOrder,
    getProductOrderStats,
    getMyOrders,
    getOrderById,
    getOrderForPayment  // ⭐ ADD THIS IMPORT
} from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';

const orderRouter = express.Router();

// PUBLIC ROUTES (no authentication required)
orderRouter.post("/quote", getQuote);
orderRouter.get("/payment/:orderId", getOrderForPayment); // ⭐ ADD THIS LINE - Payment page route

// CUSTOMER ROUTES (require user authentication)
// Order matters - more specific routes first to avoid conflicts!
orderRouter.get("/my-orders", authenticateToken, getMyOrders);
orderRouter.post("/", authenticateToken, createOrder);

// ADMIN ONLY ROUTES (require admin authentication)
orderRouter.get("/product-stats", adminAuth, getProductOrderStats);
orderRouter.get("/", adminAuth, getOrders); // View all orders (admin only)
orderRouter.put("/:orderId/status", adminAuth, updateOrderStatus);
orderRouter.put("/:orderId/accept", adminAuth, acceptOrder);
orderRouter.delete("/:orderId", adminAuth, deleteOrder);

// CUSTOMER ROUTE (with parameter - should be after specific routes)
orderRouter.get("/:orderId", authenticateToken, getOrderById);

export default orderRouter;