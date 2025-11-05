import mongoose from "mongoose";

const orderScheme = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        ref: 'user' // Reference to the User model
    },
    phone: {
        type: String,
        required: true,
        // Removed unique constraint since customers don't have accounts
        // Multiple orders can have same phone number
    },
    
    orderedItems: [{
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        image: {
            type: String,
            required: false
        },
        productId: {
            type: String,
            required: true  // This is essential for tracking totalOrdered
        }
    }],
    date: {
        type: Date,
        default: Date.now
    },
    paymentId: {
        type: String,  
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "preparing", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    paymentStatus: {
        type: String,
        enum: ["unpaid", "paid", "refunded"],
        default: "unpaid"
    },
    notes: {
        type: String,  
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    // New fields for delivery options
    deliveryOption: {
        type: String,
        enum: ["pickup", "delivery"],
        required: true,
        default: "pickup"
    },
    whatsappNumber: {
        type: String,
        required: true
    },
    preferredTime: {
        type: String,
        required: true
    },
    preferredDay: {
        type: String,
        required: true
    },
    nearestTownOrCity: {
        type: String,
        required: function() {
            return this.deliveryOption === "delivery";
        }
    },
    email: {
        type: String,
        required: false
    }
});

const Order = mongoose.model("orders", orderScheme);
export default Order;