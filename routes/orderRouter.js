import express from 'express';
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

export default orderRouter;
