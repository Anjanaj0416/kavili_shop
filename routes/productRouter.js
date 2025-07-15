// Updated productRouter.js
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

const productRouter = express.Router();

// Move specific routes first
productRouter.get("/categories", getCategories);
productRouter.get("/category/:category", getProductsByCategory);
productRouter.get("/category/:category/:productId", getProductByIdInCategory);

// Generic routes last
productRouter.post("/", createProduct);
productRouter.get("/", getProducts);
productRouter.get("/:productId", getProductById); // This should be last
productRouter.put("/:productId", updateProduct);
productRouter.delete("/:productId", deleteProduct);

export default productRouter;