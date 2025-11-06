// routes/reviewRouter.js
import express from 'express';
import { 
    createReview,
    getProductReviews,
    canUserReview,
    voteReviewHelpful,
    deleteReview,
    toggleAdminLike,
    getAllReviews,
    getUserReviews
} from '../controllers/reviewController.js';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';

const reviewRouter = express.Router();

// PUBLIC ROUTES
// Get all reviews for a specific product (with sorting)
reviewRouter.get("/product/:productId", getProductReviews);

// CUSTOMER ROUTES (require authentication)
// Create a new review
reviewRouter.post("/", authenticateToken, createReview);

// Check if user can review a product
reviewRouter.get("/can-review/:productId", authenticateToken, canUserReview);

// Vote on review helpfulness
reviewRouter.post("/:reviewId/vote", authenticateToken, voteReviewHelpful);

// Get user's own reviews
reviewRouter.get("/my-reviews", authenticateToken, getUserReviews);

// ADMIN ROUTES (require admin authentication)
// Get all reviews
reviewRouter.get("/", adminAuth, getAllReviews);

// Delete review (soft delete)
reviewRouter.delete("/:reviewId", adminAuth, deleteReview);

// Like/Unlike review
reviewRouter.put("/:reviewId/admin-like", adminAuth, toggleAdminLike);

export default reviewRouter;