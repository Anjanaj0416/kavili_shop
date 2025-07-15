import mongoose from "mongoose";
const productSchema = mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true,
    },
    productName: {
        type: String,
        required: true
    },
    altNames: [{
        type: String
    }],
    images: [{
        type: String
    }],
    price: {
        type: Number,
        required: true
    },
    lastPrice: {
        type: Number,
        required: true
    },
    description: {
        type: String
    },
    quantity: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['electronics', 'clothing', 'home', 'food', 'furniture'],
        default: 'electronics'
    },
    totalOrdered: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String
    }]

})

const Product = mongoose.model("products", productSchema);

export default Product;