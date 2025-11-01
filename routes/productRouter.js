// routes/productRouter.js - COMPLETE FIXED VERSION WITH ADMIN AUTH
import express from 'express';
import { 
    createProduct, 
    deleteProduct, 
    getCategories, 
    getProductById, 
    getProductByIdInCategory, 
    getProducts, 
    getProductsByCategory, 
    updateProduct 
} from '../controllers/productController.js';
import { adminAuth } from '../middleware/adminAuth.js';

const productRouter = express.Router();

// PUBLIC ROUTES (no authentication required)
// Move specific routes first to avoid route conflicts
productRouter.get("/categories", getCategories);
productRouter.get("/category/:category", getProductsByCategory);
productRouter.get("/category/:category/:productId", getProductByIdInCategory);
productRouter.get("/", getProducts);
productRouter.get("/:productId", getProductById); // This should be last among GET routes

// ADMIN ONLY ROUTES (require admin authentication)
productRouter.post("/", adminAuth, createProduct);
productRouter.put("/:productId", adminAuth, updateProduct);
productRouter.delete("/:productId", adminAuth, deleteProduct);

export default productRouter;