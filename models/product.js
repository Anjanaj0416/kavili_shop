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
    pricePerPiece: {
        type: Number,
        required: true
    },
    description: {
        type: String
    },
    stock: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['electronics', 'clothing', 'home', 'food', 'furniture'],
        default: 'electronics'
    },
    availabilityStatus: {
        type: String,
        enum: ['available', 'not available'],
        default: 'available'
    },
    totalOrdered: {
        type: Number,
        default: 0
    },
    bulkOffers: [{
        pieces: {
            type: Number,
            required: true
        },
        offerPrice: {
            type: Number,
            required: true
        }
    }]
})

const Product = mongoose.model("products", productSchema);

export default Product;