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
    packs: [{
        packName: {
            type: String,
            required: true
        },
        packQuantity: {
            type: Number,
            required: true
        },
        packPrice: {
            type: Number,
            required: true
        }
    }]

})

const Product = mongoose.model("products", productSchema);

export default Product;