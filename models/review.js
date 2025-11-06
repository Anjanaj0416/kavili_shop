import mongoose from "mongoose";

const reviewSchema = mongoose.Schema({
    reviewId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        ref: 'user'
    },
    // Customer Details (stored for display)
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    productId: {
        type: String,
        required: true,
        ref: 'products'
    },
    orderId: {
        type: String,
        required: true,
        ref: 'orders'
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String // Base64 encoded images stored in MongoDB
    }],
    helpfulCount: {
        type: Number,
        default: 0
    },
    helpfulVotes: [{
        userId: {
            type: String,
            required: true
        },
        isHelpful: {
            type: Boolean,
            required: true
        }
    }],
    isVerifiedPurchase: {
        type: Boolean,
        default: true
    },
    adminLiked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'deleted'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1, productId: 1 });

const Review = mongoose.model("reviews", reviewSchema);
export default Review;