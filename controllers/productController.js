import Product from "../models/product.js";
import { isAdmin } from "./userController.js";

export function createProduct(req, res) {
    /*if (!isAdmin(req)){
        res.json({
            message : "please loging as a administartor"
            
        })
        return
    }*/
    const newProductData = req.body
    if (!newProductData.productId) {
        newProductData.productId = 'P' + Date.now() + Math.random().toString(36).substr(2, 5);
    }
    if (newProductData.category) {
        const validCategories = ['sweets', 'savory', 'beverages', 'spices', 'curries'];
        if (!validCategories.includes(newProductData.category.toLowerCase())) {
            return res.status(400).json({
                message: "Invalid category. Valid categories are: " + validCategories.join(', ')
            });
        }
        newProductData.category = newProductData.category.toLowerCase();
    }
    const product = new Product(newProductData)
    product.save().then(() => {
        res.json({
            message: "product created"
        })
    }).catch((error) => {
        res.status(403).json({
            message: error
        })
    })
}

export function getProducts(req, res) {
    Product.find({}).then((products) => {
        res.json(products)
    })
}

// New function to get products by category
export async function getProductsByCategory(req, res) {
    try {
        const category = req.params.category;

        // Validate category against enum values
        const validCategories = ['sweets', 'savory', 'beverages', 'spices', 'curries'];
        if (!validCategories.includes(category.toLowerCase())) {
            return res.status(400).json({
                message: "Invalid category. Valid categories are: " + validCategories.join(', ')
            });
        }

        const products = await Product.find({ category: category.toLowerCase() });

        if (products.length === 0) {
            return res.json({
                message: `No products found in category: ${category}`,
                products: []
            });
        }

        res.json({
            category: category,
            count: products.length,
            products: products
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching products by category",
            error: error.message
        });
    }
}

// New function to get all available categories with product counts
export async function getCategories(req, res) {
    try {
        const categories = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({
            message: "Available categories",
            categories: categories
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching categories",
            error: error.message
        });
    }
}

export function deleteProduct(req, res) {
    if (!isAdmin(req)) {
        res.json({
            message: "please loging as a administartor"
        })
        return
    }
    const productId = req.params.productId
    Product.deleteOne(
        { productId: productId }
    ).then(() => {
        res.json({
            message: "product deleted"
        })
    }).catch((error) => {
        res.status(403).json({
            message: error
        })
    })
}

export function updateProduct(req, res) {
    /*if (!isAdmin(req)) {
      res.status(403).json({
        message: "Please login as administrator to update products",
      });
      return;
    }*/

    const productId = req.params.productId;
    const newProductData = req.body;

    Product.updateOne({ productId: productId }, newProductData)
        .then(() => {
            res.json({
                message: "Product updated",
            });
        })
        .catch((error) => {
            res.status(403).json({
                message: error,
            });
        });
}

export async function getProductById(req, res) {
    try {
        const productId = req.params.productId
        const product = await Product.findOne({ productId: productId })

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(product)
    } catch (error) {
        res.status(500).json({
            message: "Error fetching product",
            error: error.message
        })
    }
}
export async function getProductByIdInCategory(req, res) {
    try {
        const { category, productId } = req.params;
        
        // Validate category against enum values
        const validCategories = ['sweets', 'savory', 'beverages', 'spices', 'curries'];
        if (!validCategories.includes(category.toLowerCase())) {
            return res.status(400).json({
                message: "Invalid category. Valid categories are: " + validCategories.join(', ')
            });
        }
        
        // Find product by both productId and category
        const product = await Product.findOne({ 
            productId: productId, 
            category: category.toLowerCase() 
        });
        
        if (!product) {
            return res.status(404).json({
                message: `Product with ID ${productId} not found in category ${category}`
            });
        }
        
        res.json({
            category: category,
            product: product
        });
        
    } catch (error) {
        res.status(500).json({
            message: "Error fetching product",
            error: error.message
        });
    }
}