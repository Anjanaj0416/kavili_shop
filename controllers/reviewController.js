import Review from "../models/review.js";
import Order from "../models/order.js";
import Product from "../models/product.js";
import User from "../models/user.js";

// Helper function to generate unique review ID
async function generateUniqueReviewId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `REV-${timestamp}-${random}`;
}

// Create a new review (only for customers who have received delivered orders)
export async function createReview(req, res) {
    try {
        // Check if user is authenticated
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const { productId, orderId, rating, comment, images } = req.body;

        // Validate required fields
        if (!productId || !orderId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: "Product ID, Order ID, rating, and comment are required"
            });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        // Check if order exists and belongs to the user
        const order = await Order.findOne({
            orderId: orderId,
            userId: req.user.userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or does not belong to you"
            });
        }

        // Check if order is delivered
        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: "You can only review products from delivered orders"
            });
        }

        // Check if product exists in the order
        const productInOrder = order.orderedItems.find(item => item.productId === productId);
        if (!productInOrder) {
            return res.status(400).json({
                success: false,
                message: "Product not found in this order"
            });
        }

        // Check if user has already reviewed this product for this order
        const existingReview = await Review.findOne({
            userId: req.user.userId,
            productId: productId,
            orderId: orderId,
            status: 'active'
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this product for this order"
            });
        }

        // Generate unique review ID
        const reviewId = await generateUniqueReviewId();
        
        // Get user details for response
        const user = await User.findOne({ userId: req.user.userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Create new review with customer details
        const newReview = new Review({
            reviewId: reviewId,
            userId: req.user.userId,
            customerName: `${user.firstName} ${user.lastName || ''}`.trim(),
            customerPhone: user.phonenumber,
            productId: productId,
            orderId: orderId,
            rating: rating,
            comment: comment,
            images: images || [],
            isVerifiedPurchase: true
        });

        await newReview.save();

        res.status(201).json({
            success: true,
            message: "Review created successfully",
            review: {
                ...newReview.toObject()
            }
        });

    } catch (error) {
        console.error("Error creating review:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Get all reviews for a product
export async function getProductReviews(req, res) {
    try {
        const { productId } = req.params;
        const { sortBy = 'recent' } = req.query; // recent, helpful, rating-high, rating-low

        // Check if product exists
        const product = await Product.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Build sort criteria
        let sortCriteria = {};
        switch (sortBy) {
            case 'helpful':
                sortCriteria = { helpfulCount: -1, createdAt: -1 };
                break;
            case 'rating-high':
                sortCriteria = { rating: -1, createdAt: -1 };
                break;
            case 'rating-low':
                sortCriteria = { rating: 1, createdAt: -1 };
                break;
            case 'recent':
            default:
                sortCriteria = { createdAt: -1 };
        }

        // Get reviews
        const reviews = await Review.find({
            productId: productId,
            status: 'active'
        }).sort(sortCriteria);

        // Reviews already contain customer name and phone
        const reviewsWithUserDetails = reviews.map(review => review.toObject());

        // Calculate review statistics
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

        const ratingDistribution = {
            5: reviews.filter(r => r.rating === 5).length,
            4: reviews.filter(r => r.rating === 4).length,
            3: reviews.filter(r => r.rating === 3).length,
            2: reviews.filter(r => r.rating === 2).length,
            1: reviews.filter(r => r.rating === 1).length
        };

        res.json({
            success: true,
            statistics: {
                totalReviews: totalReviews,
                averageRating: Number(averageRating.toFixed(1)),
                ratingDistribution: ratingDistribution
            },
            reviews: reviewsWithUserDetails
        });

    } catch (error) {
        console.error("Error fetching product reviews:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Check if user can review a product (has delivered order with this product)
export async function canUserReview(req, res) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const { productId } = req.params;

        // Find delivered orders containing this product
        const deliveredOrders = await Order.find({
            userId: req.user.userId,
            status: 'delivered',
            'orderedItems.productId': productId
        });

        if (deliveredOrders.length === 0) {
            return res.json({
                success: true,
                canReview: false,
                message: "You can only review products from delivered orders"
            });
        }

        // Check if user has already reviewed this product for any of these orders
        const existingReviews = await Review.find({
            userId: req.user.userId,
            productId: productId,
            status: 'active'
        });

        // Get orders that can be reviewed (delivered orders without reviews)
        const reviewableOrders = deliveredOrders.filter(order => {
            return !existingReviews.some(review => review.orderId === order.orderId);
        });

        res.json({
            success: true,
            canReview: reviewableOrders.length > 0,
            reviewableOrders: reviewableOrders.map(order => ({
                orderId: order.orderId,
                orderDate: order.date
            })),
            message: reviewableOrders.length > 0 
                ? "You can review this product" 
                : "You have already reviewed this product for all your orders"
        });

    } catch (error) {
        console.error("Error checking review eligibility:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Vote on review helpfulness
export async function voteReviewHelpful(req, res) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const { reviewId } = req.params;
        const { isHelpful } = req.body; // true for helpful, false for not helpful

        if (typeof isHelpful !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "isHelpful must be a boolean value"
            });
        }

        const review = await Review.findOne({ reviewId: reviewId, status: 'active' });
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }

        // Check if user already voted
        const existingVoteIndex = review.helpfulVotes.findIndex(
            vote => vote.userId === req.user.userId
        );

        if (existingVoteIndex !== -1) {
            // Update existing vote
            const oldVote = review.helpfulVotes[existingVoteIndex].isHelpful;
            review.helpfulVotes[existingVoteIndex].isHelpful = isHelpful;

            // Update helpful count
            if (oldVote !== isHelpful) {
                review.helpfulCount += isHelpful ? 2 : -2; // Changed from helpful to not or vice versa
            }
        } else {
            // Add new vote
            review.helpfulVotes.push({
                userId: req.user.userId,
                isHelpful: isHelpful
            });

            // Update helpful count
            review.helpfulCount += isHelpful ? 1 : -1;
        }

        review.updatedAt = Date.now();
        await review.save();

        res.json({
            success: true,
            message: "Vote recorded successfully",
            helpfulCount: review.helpfulCount
        });

    } catch (error) {
        console.error("Error voting on review:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Admin: Delete review (soft delete)
export async function deleteReview(req, res) {
    try {
        const { reviewId } = req.params;

        const review = await Review.findOne({ reviewId: reviewId });
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }

        review.status = 'deleted';
        review.updatedAt = Date.now();
        await review.save();

        res.json({
            success: true,
            message: "Review deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Admin: Like/Unlike review
export async function toggleAdminLike(req, res) {
    try {
        const { reviewId } = req.params;

        const review = await Review.findOne({ reviewId: reviewId, status: 'active' });
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }

        review.adminLiked = !review.adminLiked;
        review.updatedAt = Date.now();
        await review.save();

        res.json({
            success: true,
            message: `Review ${review.adminLiked ? 'liked' : 'unliked'} successfully`,
            adminLiked: review.adminLiked
        });

    } catch (error) {
        console.error("Error toggling admin like:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Get all reviews (Admin)
export async function getAllReviews(req, res) {
    try {
        const { status = 'active' } = req.query;

        const reviews = await Review.find({ status: status }).sort({ createdAt: -1 });

        // Get product details for each review (customer details already in review)
        const reviewsWithDetails = await Promise.all(
            reviews.map(async (review) => {
                const product = await Product.findOne({ productId: review.productId });
                
                return {
                    ...review.toObject(),
                    productName: product ? product.productName : 'Unknown Product',
                    productImage: product && product.images.length > 0 ? product.images[0] : null
                };
            })
        );

        res.json({
            success: true,
            total: reviews.length,
            reviews: reviewsWithDetails
        });

    } catch (error) {
        console.error("Error fetching all reviews:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Get user's reviews
export async function getUserReviews(req, res) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const reviews = await Review.find({
            userId: req.user.userId,
            status: 'active'
        }).sort({ createdAt: -1 });

        // Get product details for each review
        const reviewsWithProducts = await Promise.all(
            reviews.map(async (review) => {
                const product = await Product.findOne({ productId: review.productId });
                return {
                    ...review.toObject(),
                    productName: product ? product.productName : 'Unknown Product',
                    productImage: product && product.images.length > 0 ? product.images[0] : null
                };
            })
        );

        res.json({
            success: true,
            total: reviews.length,
            reviews: reviewsWithProducts
        });

    } catch (error) {
        console.error("Error fetching user reviews:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export default {
    createReview,
    getProductReviews,
    canUserReview,
    voteReviewHelpful,
    deleteReview,
    toggleAdminLike,
    getAllReviews,
    getUserReviews
};