/*import express from 'express';
import { 
    createOrder, 
    deleteOrder, 
    getOrders, 
    getQuote, 
    updateOrderStatus, 
    getProductOrderStats 
} from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.get("/", getOrders);
orderRouter.post("/quote", getQuote);
orderRouter.put("/:orderId/status", updateOrderStatus);
orderRouter.delete("/:orderId", deleteOrder);
orderRouter.get("/product-stats", getProductOrderStats);

export default orderRouter;*/

/*import express from 'express';
import { 
    createOrder, 
    deleteOrder, 
    getOrders, 
    getQuote, 
    updateOrderStatus, 
    getProductOrderStats 
} from '../controllers/orderController.js';


const orderRouter = express.Router();

// Public routes
orderRouter.post("/quote", getQuote);

// Protected routes (require authentication)
orderRouter.post("/", createOrder);

// Admin only routes
orderRouter.get("/",  getOrders);
orderRouter.put("/:orderId/status",  updateOrderStatus);
orderRouter.delete("/:orderId",  deleteOrder);
orderRouter.get("/product-stats",  getProductOrderStats);

export default orderRouter;*/


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

const orderRouter = express.Router();

// Public routes (no authentication required)
orderRouter.post("/quote", getQuote);

// Protected routes (require authentication)
// Order matters - more specific routes first!
orderRouter.get("/my-orders", authenticateToken, getMyOrders);
orderRouter.get("/product-stats", authenticateToken, getProductOrderStats);
orderRouter.post("/", authenticateToken, createOrder);
orderRouter.get("/", authenticateToken, getOrders);

// Routes with parameters should come after specific routes
orderRouter.get("/:orderId", authenticateToken, getOrderById);
orderRouter.put("/:orderId/status", authenticateToken, updateOrderStatus);
orderRouter.delete("/:orderId", authenticateToken, deleteOrder);

export default orderRouter;
